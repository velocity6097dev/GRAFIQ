<?php
/**
 * Razorpay webhook receiver.
 *
 * This is the production-grade counterpart to razorpay_queue_worker.php:
 * instead of your server polling Razorpay ("has this payment cleared
 * yet?"), Razorpay pushes events to this URL the moment something
 * happens (payment.captured, payment.failed, etc).
 *
 * IT WON'T FIRE ON LOCAL XAMPP — Razorpay needs a public HTTPS URL to
 * send webhooks to, and localhost isn't reachable from the internet.
 * For local development, razorpay_queue_worker.php (the polling queue)
 * is what actually confirms payments — this file only matters once you
 * deploy somewhere public. To test it before then, tunnel your local
 * server with something like ngrok and point the Razorpay dashboard's
 * webhook URL at the tunnel's https address.
 *
 * Setup once you're deployed:
 *   1. Razorpay dashboard → Settings → Webhooks → Add New Webhook.
 *   2. URL: https://yourdomain.com/grafiq-api/razorpay_webhook.php
 *   3. Active events: at least "payment.captured" and "payment.failed".
 *   4. Copy the "Webhook Secret" it gives you into RAZORPAY_WEBHOOK_SECRET
 *      in config.php.
 */
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
}

if (!RAZORPAY_WEBHOOK_SECRET) {
    send_error('Webhook secret not configured — see the comment at the top of this file.', 500);
}

$rawBody = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';

$expected = hash_hmac('sha256', $rawBody, RAZORPAY_WEBHOOK_SECRET);
if (!hash_equals($expected, $signature)) {
    send_error('Invalid webhook signature.', 400);
}

$event = json_decode($rawBody, true) ?: [];
$eventType = $event['event'] ?? '';
$paymentEntity = $event['payload']['payment']['entity'] ?? null;

if (!$paymentEntity || !in_array($eventType, ['payment.captured', 'payment.failed'], true)) {
    // Not an event we care about — acknowledge with 200 so Razorpay
    // doesn't keep retrying it.
    send_json(['received' => true, 'handled' => false]);
}

$razorpayPaymentId = $paymentEntity['id'] ?? '';
$stmt = $pdo->prepare('SELECT * FROM payments WHERE razorpay_payment_id = ?');
$stmt->execute([$razorpayPaymentId]);
$payment = $stmt->fetch();

if (!$payment) {
    // We don't recognise this payment (maybe from a different app using
    // the same Razorpay account) — acknowledge and ignore.
    send_json(['received' => true, 'handled' => false]);
}

if ($eventType === 'payment.captured') {
    $pdo->prepare("UPDATE payments SET status = 'verified', verified_at = NOW() WHERE id = ?")->execute([$payment['id']]);
    $pdo->prepare("UPDATE orders SET payment_status = 'paid' WHERE id = ?")->execute([$payment['order_id']]);
} else {
    $pdo->prepare("UPDATE payments SET status = 'failed', error_message = 'Razorpay reported payment.failed' WHERE id = ?")
        ->execute([$payment['id']]);
    $pdo->prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?")->execute([$payment['order_id']]);
}

send_json(['received' => true, 'handled' => true]);
