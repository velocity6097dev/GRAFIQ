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

$data = request_body();
$amount = (float) ($data['amount'] ?? 0);
if ($amount <= 0) {
    send_error('A valid order amount is required.');
}

// Razorpay amounts are in the smallest currency unit — paise for INR.
$amountInPaise = (int) round($amount * 100);
$receipt = $data['receipt'] ?? ('grafiq_' . bin2hex(random_bytes(6)));

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
