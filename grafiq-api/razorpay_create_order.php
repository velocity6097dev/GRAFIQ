<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
}

if (!razorpay_configured()) {
    send_error(
        'Razorpay keys are not set up yet. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in grafiq-api/config.php ' .
        '(get free test keys at https://dashboard.razorpay.com/app/keys).',
        500
    );
}

// Must be a verified customer to start a payment at all.
require_customer($pdo);

$data = request_body();

// The amount charged is computed here, server-side, from the actual cart
// contents + the store's own settings — never from a number the client
// sends. (Previously this endpoint just charged whatever `amount` the
// client passed in — a client could open the real Razorpay checkout for
// literally any amount, e.g. ₹1, and razorpay_verify.php would still
// have accepted an order recording a full-price cart against it, since
// the two weren't cross-checked against real product prices.)
$settingsRow = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();
if (!$settingsRow) send_error('Settings row missing — did you import schema.sql?', 500);

try {
    $totals = compute_order_totals($pdo, $data['items'] ?? [], $settingsRow);
} catch (RuntimeException $e) {
    send_error($e->getMessage());
}

// paymentMethod tells us WHICH of the two Razorpay-backed flows this is:
//  - 'Razorpay' = a normal full online payment → charge the full total.
//  - 'COD'      = the non-refundable upfront advance on a partial-COD
//    order (see the partial-COD feature) → charge codAdvancePercent% of
//    the total, not the total itself.
$paymentMethod = $data['paymentMethod'] ?? 'Razorpay';
$codAdvancePercent = (float) ($settingsRow['cod_advance_percent'] ?? 0);

if ($paymentMethod === 'COD') {
    if ($codAdvancePercent <= 0) {
        send_error('This store is not currently requiring a COD advance payment.', 400);
    }
    $amount = round($totals['total'] * $codAdvancePercent / 100, 2);
} else {
    $amount = $totals['total'];
}

if ($amount <= 0) {
    send_error('A valid order amount is required.');
}

// Razorpay amounts are in the smallest currency unit — paise for INR.
$amountInPaise = (int) round($amount * 100);
$receipt = 'grafiq_' . bin2hex(random_bytes(6));

try {
    [$status, $body] = razorpay_request('POST', '/orders', [
        'amount'   => $amountInPaise,
        'currency' => 'INR',
        'receipt'  => $receipt,
    ]);
} catch (RuntimeException $e) {
    send_error($e->getMessage(), 502);
}

if ($status < 200 || $status >= 300 || empty($body['id'])) {
    $message = $body['error']['description'] ?? 'Razorpay rejected the order request.';
    send_error("Could not create the payment order: $message", 502);
}

send_json([
    'razorpayOrderId' => $body['id'],
    'amount'          => $body['amount'],
    'currency'        => $body['currency'],
    'keyId'           => RAZORPAY_KEY_ID,
]);
