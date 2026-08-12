<?php
/**
 * Admin-only payment actions for a single order: "Verify Payment" (re-check
 * the linked Razorpay payment's real status) and "Refund" (issue a refund —
 * full or a manually-chosen partial amount — against that payment).
 *
 * This is what backs the Verify Payment / Refund buttons in the admin
 * order page's Payment section. It's deliberately separate from
 * order_cancel.php's automatic refund-on-cancel: that one only ever
 * refunds a fully-paid ('paid') order automatically. A partial-COD
 * order's advance is non-refundable by policy, so any refund on one of
 * those (e.g. a goodwill refund minus shipping) is always a manual admin
 * action through this endpoint.
 */
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
}

require_admin($pdo);

$data = request_body();
$orderId = trim($data['orderId'] ?? '');
$action = $data['action'] ?? '';

if (!$orderId) send_error('orderId is required.');

$stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
$stmt->execute([$orderId]);
$order = $stmt->fetch();
if (!$order) send_error('Order not found.', 404);

$paymentStmt = $pdo->prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1');
$paymentStmt->execute([$orderId]);
$payment = $paymentStmt->fetch();

switch ($action) {
    case 'verify':
        if (!$payment || !$payment['razorpay_payment_id']) {
            send_error('This order has no Razorpay payment to verify.');
        }
        if (!razorpay_configured()) {
            send_error('Razorpay keys are not configured in grafiq-api/config.php.');
        }

        try {
            [$status, $rBody] = razorpay_request('GET', "/payments/{$payment['razorpay_payment_id']}");
        } catch (RuntimeException $e) {
            send_error($e->getMessage(), 502);
        }
        if ($status < 200 || $status >= 300 || empty($rBody['id'])) {
            send_error('Could not reach Razorpay to verify this payment right now.', 502);
        }

        $captured = ($rBody['status'] ?? '') === 'captured';
        $pdo->prepare('UPDATE payments SET status = ?, verified_at = IF(? = 1, NOW(), verified_at), attempts = attempts + 1 WHERE id = ?')
            ->execute([$captured ? 'verified' : 'failed', $captured ? 1 : 0, $payment['id']]);

        // A partial-COD order's payment_status stays 'partial' (advance
        // paid, balance due on delivery) rather than jumping to 'paid' —
        // only the advance itself was ever charged through Razorpay.
        if ($captured) {
            $newOrderPaymentStatus = $order['payment_method'] === 'COD' ? 'partial' : 'paid';
        } else {
            $newOrderPaymentStatus = 'failed';
        }
        $pdo->prepare('UPDATE orders SET payment_status = ? WHERE id = ?')->execute([$newOrderPaymentStatus, $orderId]);
        break;

    case 'refund':
        if (!$payment || !$payment['razorpay_payment_id']) {
            send_error('This order has no Razorpay payment to refund.');
        }
        if (!razorpay_configured()) {
            send_error('Razorpay keys are not configured in grafiq-api/config.php.');
        }

        // Admin can choose a smaller amount than what was paid — e.g.
        // deducting shipping charges from a COD advance refund by hand,
        // per the store's terms. Defaults to a full refund of that payment.
        $amount = array_key_exists('amount', $data) && $data['amount'] !== ''
            ? (float) $data['amount']
            : (float) $payment['amount'];

        if ($amount <= 0) send_error('Enter a refund amount greater than 0.');
        if ($amount > (float) $payment['amount'] + 0.01) {
            send_error('Refund amount can\'t exceed the ' . $payment['amount'] . ' that was actually paid.');
        }

        try {
            [$status, $rBody] = razorpay_request('POST', "/payments/{$payment['razorpay_payment_id']}/refund", [
                'amount' => (int) round($amount * 100),
            ]);
        } catch (RuntimeException $e) {
            send_error($e->getMessage(), 502);
        }
        if ($status < 200 || $status >= 300 || empty($rBody['id'])) {
            $message = $rBody['error']['description'] ?? 'Razorpay rejected the refund request.';
            send_error("Could not process refund: $message", 502);
        }

        $pdo->prepare('UPDATE orders SET refund_status = ?, refund_id = ? WHERE id = ?')
            ->execute(['processing', $rBody['id'], $orderId]);
        break;

    default:
        send_error('Unknown action. Use "verify" or "refund".', 400);
}

$row = fetch_order_row($pdo, $orderId);
send_json(row_to_order($row));
