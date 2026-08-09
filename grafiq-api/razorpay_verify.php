<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
}

function row_to_order_local(array $r): array
{
    $createdAt = null;
    if (!empty($r['created_at'])) {
        $createdAt = (new DateTime($r['created_at']))->format(DATE_ATOM);
    }
    return [
        'id'            => $r['id'],
        'customerPhone' => $r['customer_phone'],
        'status'        => $r['status'],
        'items'         => decode_json_column($r['items']),
        'address'       => decode_json_column($r['address'], new stdClass()),
        'paymentMethod' => $r['payment_method'],
        'paymentStatus' => $r['payment_status'],
        'subtotal'      => (float) $r['subtotal'],
        'discountTotal' => (float) $r['discount_total'],
        'deliveryFee'   => (float) $r['delivery_fee'],
        'total'         => (float) $r['total'],
        'shipping'      => decode_json_column($r['shipping'], null),
        'createdAt'     => $createdAt,
    ];
}

$data = request_body();
$razorpayOrderId   = $data['razorpayOrderId'] ?? '';
$razorpayPaymentId = $data['razorpayPaymentId'] ?? '';
$razorpaySignature = $data['razorpaySignature'] ?? '';
$orderData         = $data['orderData'] ?? [];

if (!$razorpayOrderId || !$razorpayPaymentId || !$razorpaySignature) {
    send_error('Missing payment details from Razorpay.');
}
if (empty($orderData['items'])) {
    send_error('Order must contain at least one item.');
}

// ---------- Step 1: signature check (fast, no network call) ----------
// Per Razorpay's docs: expected = HMAC-SHA256(razorpay_order_id + "|" +
// razorpay_payment_id, key_secret). This can only have been produced by
// someone holding your key_secret — i.e. Razorpay itself — so a match
// here is already strong proof the payment is genuine.
$expectedSignature = hash_hmac('sha256', $razorpayOrderId . '|' . $razorpayPaymentId, RAZORPAY_KEY_SECRET);
if (!hash_equals($expectedSignature, $razorpaySignature)) {
    send_error('Payment verification failed (signature mismatch). If you were actually charged, contact support with your payment ID.', 400);
}

// ---------- Step 2: cross-check the amount against Razorpay's own
// record of the order, so a tampered client can't claim a bigger cart
// total than what was actually paid ----------
try {
    [$rzpStatus, $rzpOrder] = razorpay_request('GET', "/orders/{$razorpayOrderId}");
} catch (RuntimeException $e) {
    send_error($e->getMessage(), 502);
}
if ($rzpStatus < 200 || $rzpStatus >= 300 || empty($rzpOrder['id'])) {
    send_error('Could not confirm this payment with Razorpay right now. If you were charged, contact support with your payment ID.', 502);
}
$paidRupees = ($rzpOrder['amount'] ?? 0) / 100;
$claimedTotal = (float) ($orderData['total'] ?? 0);
if (abs($paidRupees - $claimedTotal) > 0.5) {
    send_error('The paid amount does not match this order — rejected for your protection. Contact support with your payment ID.', 400);
}

// ---------- Step 3: create the order + queue it for a second,
// independent verification pass (razorpay_queue_worker.php) ----------
for ($attempt = 0; $attempt < 5; $attempt++) {
    $newOrderId = generate_order_id();
    $exists = $pdo->prepare('SELECT 1 FROM orders WHERE id = ?');
    $exists->execute([$newOrderId]);
    if (!$exists->fetch()) break;
}

$pdo->beginTransaction();
try {
    $pdo->prepare(
        'INSERT INTO orders (id, customer_phone, status, items, address, payment_method, payment_status, subtotal, discount_total, delivery_fee, total, shipping)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $newOrderId,
        $orderData['customerPhone'] ?? null,
        'Pending',
        json_encode($orderData['items']),
        json_encode($orderData['address'] ?? []),
        'Razorpay',
        // Signature + amount already checked above, so this is confirmed
        // paid as far as the customer-facing flow is concerned. The queue
        // worker still independently re-confirms it against Razorpay's
        // API shortly after (belt-and-braces, and it's what would catch
        // e.g. a since-refunded payment).
        'paid',
        $orderData['subtotal'] ?? 0,
        $orderData['discountTotal'] ?? 0,
        $orderData['deliveryFee'] ?? 0,
        $orderData['total'] ?? 0,
        null,
    ]);

    $pdo->prepare(
        'INSERT INTO payments (order_id, provider, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status)
         VALUES (?,?,?,?,?,?,?,?)'
    )->execute([
        $newOrderId, 'razorpay', $razorpayOrderId, $razorpayPaymentId, $razorpaySignature,
        $orderData['total'] ?? 0, 'INR', 'pending_verification',
    ]);

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    send_error('Payment was verified but the order could not be saved: ' . $e->getMessage(), 500);
}

$stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
$stmt->execute([$newOrderId]);
send_json(row_to_order_local($stmt->fetch()), 201);
