<?php
/**
 * Payment verification queue worker.
 *
 * Every row in `payments` with status = 'pending_verification' represents
 * a payment that passed the fast client-side signature check in
 * razorpay_verify.php, but hasn't yet been independently re-confirmed
 * against Razorpay's own records. This script does that second check —
 * the actual "queue processing" step.
 *
 * Run it two ways:
 *   1. CLI / cron (recommended for production):
 *        php grafiq-api/razorpay_queue_worker.php
 *      Set up a real cron job (Linux/Mac) or Task Scheduler (Windows) to
 *      run this every minute or two.
 *   2. On demand over HTTP — POST /razorpay_queue_worker.php — which is
 *      what the admin panel's "Verify Pending Payments" button calls.
 *      Handy for local XAMPP dev where you don't have cron running.
 */
require __DIR__ . '/config.php';

const MAX_ATTEMPTS = 10;

function process_queue(PDO $pdo): array
{
    $results = ['processed' => 0, 'verified' => 0, 'failed' => 0, 'retried' => 0, 'details' => []];

    $stmt = $pdo->query(
        "SELECT p.*, o.payment_method AS order_payment_method
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE p.status = 'pending_verification'
         ORDER BY p.created_at ASC LIMIT 50"
    );
    $rows = $stmt->fetchAll();

    foreach ($rows as $row) {
        $results['processed']++;

        if (!razorpay_configured()) {
            $results['details'][] = "Skipped {$row['order_id']}: Razorpay keys not configured.";
            continue;
        }

        try {
            [$status, $payment] = razorpay_request('GET', "/payments/{$row['razorpay_payment_id']}");
        } catch (RuntimeException $e) {
            mark_retry($pdo, $row, 'Network error reaching Razorpay: ' . $e->getMessage());
            $results['retried']++;
            $results['details'][] = "Retry {$row['order_id']}: network error.";
            continue;
        }

        if ($status < 200 || $status >= 300 || empty($payment['id'])) {
            mark_retry($pdo, $row, 'Razorpay returned an unexpected response looking up this payment.');
            $results['retried']++;
            $results['details'][] = "Retry {$row['order_id']}: bad Razorpay response.";
            continue;
        }

        $capturedOk = ($payment['status'] ?? '') === 'captured';
        $amountOk = abs((float) ($payment['amount'] ?? 0) - (float) round($row['amount'] * 100)) < 1;
        $orderOk = ($payment['order_id'] ?? '') === $row['razorpay_order_id'];

        if ($capturedOk && $amountOk && $orderOk) {
            $pdo->prepare("UPDATE payments SET status = 'verified', verified_at = NOW(), attempts = attempts + 1 WHERE id = ?")
                ->execute([$row['id']]);
            // A COD order (see the partial-COD feature) only ever has this
            // payment as its upfront advance — the rest is due in cash on
            // delivery — so it stays 'partial', never jumps to 'paid'.
            $orderPaymentStatus = $row['order_payment_method'] === 'COD' ? 'partial' : 'paid';
            $pdo->prepare('UPDATE orders SET payment_status = ? WHERE id = ?')->execute([$orderPaymentStatus, $row['order_id']]);
            $results['verified']++;
            $results['details'][] = "Verified {$row['order_id']}.";
        } else {
            $reason = !$capturedOk
                ? "Razorpay payment status is '{$payment['status']}', not 'captured'."
                : (!$amountOk ? 'Amount mismatch between order and Razorpay payment.' : 'Razorpay order ID mismatch.');
            $pdo->prepare("UPDATE payments SET status = 'failed', attempts = attempts + 1, error_message = ? WHERE id = ?")
                ->execute([$reason, $row['id']]);
            $pdo->prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?")->execute([$row['order_id']]);
            $results['failed']++;
            $results['details'][] = "Failed {$row['order_id']}: $reason";
        }
    }

    return $results;
}

function mark_retry(PDO $pdo, array $row, string $reason): void
{
    $attempts = $row['attempts'] + 1;
    if ($attempts >= MAX_ATTEMPTS) {
        $pdo->prepare("UPDATE payments SET status = 'failed', attempts = ?, error_message = ? WHERE id = ?")
            ->execute([$attempts, "$reason (gave up after $attempts attempts)", $row['id']]);
        $pdo->prepare("UPDATE orders SET payment_status = 'failed' WHERE id = ?")->execute([$row['order_id']]);
        return;
    }
    $pdo->prepare("UPDATE payments SET attempts = ?, error_message = ? WHERE id = ?")
        ->execute([$attempts, $reason, $row['id']]);
}

$results = process_queue($pdo);

if (PHP_SAPI === 'cli') {
    echo "Payment queue: processed {$results['processed']}, verified {$results['verified']}, failed {$results['failed']}, retried {$results['retried']}\n";
    foreach ($results['details'] as $line) echo "  - $line\n";
} else {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' && ($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
        send_error('Method not allowed.', 405);
    }
    send_json($results);
}
