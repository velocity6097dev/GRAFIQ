<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
}

// Which customer this order belongs to comes from their verified
// session, never from orderData.customerPhone in the body.
$phone = require_customer($pdo);

$data = request_body();
$razorpayOrderId   = $data['razorpayOrderId'] ?? '';
$razorpayPaymentId = $data['razorpayPaymentId'] ?? '';
$razorpaySignature = $data['razorpaySignature'] ?? '';
$orderData         = $data['orderData'] ?? [];

if (!$razorpayOrderId || !$razorpayPaymentId || !$razorpaySignature) {
    send_error('Missing payment details from Razorpay.');
}

// This endpoint handles two different payments that both go through
// Razorpay's checkout:
//   - a normal full online payment (paymentMethod: 'Razorpay')
//   - the non-refundable upfront advance on a partial-COD order
//     (paymentMethod: 'COD') — see the partial-COD feature: the customer
//     pays settings.codAdvancePercent% now, the rest in cash on delivery.
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

// ---------- Step 2: recompute the authoritative order total server-side
// (never trust orderData.items' price/discount fields, or
// orderData.subtotal/total directly) and cross-check it — together with
// which of the two payment flows this is — against what Razorpay
// actually charged, so a tampered client can't claim a cheaper/different
// cart than what was actually paid for ----------
$settingsRow = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();
if (!$settingsRow) send_error('Settings row missing — did you import schema.sql?', 500);

try {
    $totals = compute_order_totals($pdo, $orderData['items'] ?? [], $settingsRow);
} catch (RuntimeException $e) {
    send_error($e->getMessage());
}

$codAdvancePercent = (float) ($settingsRow['cod_advance_percent'] ?? 0);
$expectedAmount = $isCodAdvance
    ? round($totals['total'] * $codAdvancePercent / 100, 2)
    : $totals['total'];

try {
    [$rzpStatus, $rzpOrder] = razorpay_request('GET', "/orders/{$razorpayOrderId}");
} catch (RuntimeException $e) {
    send_error($e->getMessage(), 502);
}
if ($rzpStatus < 200 || $rzpStatus >= 300 || empty($rzpOrder['id'])) {
    send_error('Could not confirm this payment with Razorpay right now. If you were charged, contact support with your payment ID.', 502);
}
$paidRupees = ($rzpOrder['amount'] ?? 0) / 100;
if (abs($paidRupees - $expectedAmount) > 0.5) {
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
    $initialHistory = [['status' => 'Pending', 'at' => (new DateTime())->format(DATE_ATOM)]];

    $pdo->prepare(
        'INSERT INTO orders (id, customer_phone, customer_email, customer_ip, status, status_history, items, address, payment_method, payment_status, subtotal, discount_total, delivery_fee, total, advance_amount, advance_paid, shipping)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $newOrderId,
        $phone,
        $email ?: null,
        client_ip(),
        'Pending',
        json_encode($initialHistory),
        json_encode($totals['items']),
        json_encode($orderData['address'] ?? []),
        $paymentMethodToStore,
        $paymentStatusToStore,
        $totals['subtotal'],
        $totals['discountTotal'],
        $totals['deliveryFee'],
        $totals['total'],
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
