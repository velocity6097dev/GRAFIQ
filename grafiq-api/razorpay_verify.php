<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
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

// This endpoint handles two different payments that both go through
// Razorpay's checkout:
//   - a normal full online payment (paymentMethod: 'Razorpay')
//   - the non-refundable upfront advance on a partial-COD order
//     (paymentMethod: 'COD') — see the partial-COD feature: the customer
//     pays settings.codAdvancePercent% now, the rest in cash on delivery.
// `paidAmount` is what was actually charged via Razorpay right now;
// `total` stays the full order value either way.
$isCodAdvance = ($orderData['paymentMethod'] ?? '') === 'COD';

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
$claimedPaid = (float) ($orderData['paidAmount'] ?? $orderData['total'] ?? 0);
if (abs($paidRupees - $claimedPaid) > 0.5) {
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

$paymentMethodToStore = $isCodAdvance ? 'COD' : 'Razorpay';
// 'partial' = COD advance paid online, remainder due (in cash) on
// delivery. Signature + amount already checked above, so both cases are
// confirmed paid-so-far as far as the customer-facing flow is concerned.
// The queue worker still independently re-confirms the payment row
// against Razorpay's API shortly after (belt-and-braces, and it's what
// would catch e.g. a since-refunded payment).
$paymentStatusToStore = $isCodAdvance ? 'partial' : 'paid';
$advanceAmount = $isCodAdvance ? $paidRupees : 0;
$advancePaid = $isCodAdvance ? 1 : 0;
$email = $orderData['customerEmail'] ?? ($orderData['address']['email'] ?? null);

$pdo->beginTransaction();
try {
    $pdo->prepare(
        'INSERT INTO orders (id, customer_phone, customer_email, status, items, address, payment_method, payment_status, subtotal, discount_total, delivery_fee, total, advance_amount, advance_paid, shipping)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $newOrderId,
        $orderData['customerPhone'] ?? null,
        $email ?: null,
        'Pending',
        json_encode($orderData['items']),
        json_encode($orderData['address'] ?? []),
        $paymentMethodToStore,
        $paymentStatusToStore,
        $orderData['subtotal'] ?? 0,
        $orderData['discountTotal'] ?? 0,
        $orderData['deliveryFee'] ?? 0,
        $orderData['total'] ?? 0,
        $advanceAmount,
        $advancePaid,
        null,
    ]);

    $pdo->prepare(
        'INSERT INTO payments (order_id, provider, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status)
         VALUES (?,?,?,?,?,?,?,?)'
    )->execute([
        $newOrderId, 'razorpay', $razorpayOrderId, $razorpayPaymentId, $razorpaySignature,
        $paidRupees, 'INR', 'pending_verification',
    ]);

    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    send_error('Payment was verified but the order could not be saved: ' . $e->getMessage(), 500);
}

$row = fetch_order_row($pdo, $newOrderId);
send_json(row_to_order($row), 201);
