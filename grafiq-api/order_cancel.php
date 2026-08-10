<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
}

// Statuses a customer is still allowed to cancel from. The instant an
// order moves to 'Shipped' (or anything past it), this list no longer
// contains it — so even if someone bypasses the UI and calls this
// endpoint directly, the cancellation is rejected here, server-side.
// This is the actual enforcement; the frontend hiding the Cancel button
// is just the friendly version of the same rule.
const CANCELLABLE_STATUSES = ['Pending', 'Confirmed', 'Processing'];

function row_to_order_local(array $r): array
{
    $createdAt = null;
    if (!empty($r['created_at'])) $createdAt = (new DateTime($r['created_at']))->format(DATE_ATOM);
    $cancelledAt = null;
    if (!empty($r['cancelled_at'])) $cancelledAt = (new DateTime($r['cancelled_at']))->format(DATE_ATOM);
    return [
        'id'                 => $r['id'],
        'customerPhone'      => $r['customer_phone'],
        'status'             => $r['status'],
        'statusHistory'      => decode_json_column($r['status_history']),
        'items'              => decode_json_column($r['items']),
        'address'            => decode_json_column($r['address'], new stdClass()),
        'paymentMethod'      => $r['payment_method'],
        'paymentStatus'      => $r['payment_status'],
        'subtotal'           => (float) $r['subtotal'],
        'discountTotal'      => (float) $r['discount_total'],
        'deliveryFee'        => (float) $r['delivery_fee'],
        'total'              => (float) $r['total'],
        'shipping'           => decode_json_column($r['shipping'], null),
        'cancelledAt'        => $cancelledAt,
        'cancellationReason' => $r['cancellation_reason'],
        'refundStatus'       => $r['refund_status'],
        'createdAt'          => $createdAt,
    ];
}

$data = request_body();
$orderId = $data['orderId'] ?? '';
$phone = preg_replace('/\D/', '', $data['customerPhone'] ?? '');
$reason = trim($data['reason'] ?? '');

if (!$orderId || !$phone) {
    send_error('orderId and customerPhone are required.');
}

$stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
$stmt->execute([$orderId]);
$order = $stmt->fetch();

if (!$order) send_error('Order not found.', 404);

// Ownership check — same lightweight phone-match approach used
// elsewhere in this demo (see customer_auth.php); there's no full
// session/token system, so this is what stands in for "is this really
// your order".
if ($order['customer_phone'] !== $phone) {
    send_error('This order does not belong to that phone number.', 403);
}

if (!in_array($order['status'], CANCELLABLE_STATUSES, true)) {
    send_error(
        "This order can no longer be cancelled — it's already {$order['status']}. " .
        'Orders can only be cancelled before they ship.',
        409
    );
}

$pdo->beginTransaction();
try {
    $history = decode_json_column($order['status_history']);
    $history = append_status_history($history, 'Cancelled');

    $pdo->prepare(
        "UPDATE orders SET status = 'Cancelled', status_history = ?, cancelled_at = NOW(), cancellation_reason = ? WHERE id = ?"
    )->execute([json_encode($history), $reason ?: null, $orderId]);

    $refundStatus = null;
    if ($order['payment_status'] === 'paid') {
        // Real refund attempt via Razorpay, not just a status flag —
        // mirrors the same razorpay_request() helper the payment queue
        // uses. If Razorpay can't be reached right now, we still record
        // the cancellation (that part shouldn't be blocked by a flaky
        // API call) but mark the refund as failed so it's visible and
        // can be retried from the admin panel.
        $paymentStmt = $pdo->prepare(
            "SELECT * FROM payments WHERE order_id = ? AND status IN ('verified', 'pending_verification') ORDER BY created_at DESC LIMIT 1"
        );
        $paymentStmt->execute([$orderId]);
        $payment = $paymentStmt->fetch();

        if ($payment && razorpay_configured()) {
            try {
                [$rStatus, $rBody] = razorpay_request('POST', "/payments/{$payment['razorpay_payment_id']}/refund", [
                    'amount' => (int) round($order['total'] * 100),
                ]);
                if ($rStatus >= 200 && $rStatus < 300 && !empty($rBody['id'])) {
                    $refundStatus = 'processing';
                    $pdo->prepare('UPDATE orders SET refund_status = ?, refund_id = ? WHERE id = ?')
                        ->execute([$refundStatus, $rBody['id'], $orderId]);
                } else {
                    $refundStatus = 'failed';
                    $pdo->prepare('UPDATE orders SET refund_status = ? WHERE id = ?')->execute([$refundStatus, $orderId]);
                }
            } catch (RuntimeException $e) {
                $refundStatus = 'failed';
                $pdo->prepare('UPDATE orders SET refund_status = ? WHERE id = ?')->execute([$refundStatus, $orderId]);
            }
        } else {
            // Paid but no matching payment record or Razorpay isn't
            // configured — flag for manual handling rather than
            // pretending nothing needs to happen.
            $refundStatus = 'pending';
            $pdo->prepare('UPDATE orders SET refund_status = ? WHERE id = ?')->execute([$refundStatus, $orderId]);
        }
    }

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    send_error('Could not cancel the order: ' . $e->getMessage(), 500);
}

$stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
$stmt->execute([$orderId]);
send_json(row_to_order_local($stmt->fetch()));
