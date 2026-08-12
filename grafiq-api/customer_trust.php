<?php
/**
 * Admin-only "Customer Trust" summary — backs the Customer Security
 * panel's Trust/Risk icon and its "Customer Trust Details" popup on the
 * admin order page.
 *
 * This is a simple, transparent heuristic computed live from this
 * customer's own order + replacement history — NOT a real fraud-scoring
 * system (no device fingerprinting, velocity checks, cross-customer
 * signals, etc). Treat it as a quick sanity-check signal for an admin
 * reviewing an order, not an automated decision-maker. Tune the weights
 * in compute_trust_score() below to match your own risk tolerance as
 * you see how it performs against real customers.
 *
 * Note on "Returned Orders" vs "Replacement Requests": this store only
 * has a replacement flow, not a separate return-for-refund flow, so the
 * two are derived from the same `replacements` table but mean different
 * things here — Replacement Requests is every request raised regardless
 * of outcome; Returned Orders counts only ones that reached
 * 'Replacement Delivered' (i.e. the original item actually came back
 * and a replacement completed). Adjust this mapping if you later add a
 * distinct return-for-refund flow.
 */
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_error('Method not allowed.', 405);
}

require_admin($pdo);

$phone = preg_replace('/\D/', '', $_GET['phone'] ?? '');
if (!$phone) send_error('phone is required.');

function count_query(PDO $pdo, string $sql, array $params): int
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int) $stmt->fetchColumn();
}

/**
 * Rate-based heuristic (not raw counts) so a customer with 1 cancelled
 * order out of 1 total isn't scored the same as one with 1 cancelled out
 * of 50 — the weights below are how heavily each signal counts against
 * a customer once expressed as a share of their own order history.
 */
function compute_trust_score(int $total, int $cancelled, int $returned, int $replacementRequests, int $failed): array
{
    if ($total <= 0) {
        return ['score' => 100, 'level' => 'GOOD'];
    }

    $cancelRate = $cancelled / $total;
    $failRate = $failed / $total;
    $returnRate = $returned / $total;
    $replacementRate = $replacementRequests / $total;

    // Cancellations and failed payments are weighted heaviest — the most
    // direct signal of unreliable or fraudulent intent. Returns and
    // replacement requests are weighted lighter since they're also just
    // customers using a feature the store offers them.
    $penalty = ($cancelRate * 40) + ($failRate * 25) + ($returnRate * 20) + ($replacementRate * 15);
    $score = (int) max(0, min(100, round(100 - $penalty)));

    if ($score >= 75) {
        $level = 'GOOD';
    } elseif ($score >= 45) {
        $level = 'MEDIUM_RISK';
    } else {
        $level = 'RISKY';
    }

    return ['score' => $score, 'level' => $level];
}

$customerStmt = $pdo->prepare('SELECT * FROM customers WHERE phone = ?');
$customerStmt->execute([$phone]);
$customer = $customerStmt->fetch();

$totalOrders = count_query($pdo, 'SELECT COUNT(*) FROM orders WHERE customer_phone = ?', [$phone]);
$cancelledOrders = count_query(
    $pdo,
    "SELECT COUNT(*) FROM orders WHERE customer_phone = ? AND status = 'Cancelled'",
    [$phone]
);
$failedOrders = count_query(
    $pdo,
    "SELECT COUNT(*) FROM orders WHERE customer_phone = ? AND payment_status = 'failed'",
    [$phone]
);
$replacementRequests = count_query(
    $pdo,
    'SELECT COUNT(*) FROM replacements r JOIN orders o ON o.id = r.order_id WHERE o.customer_phone = ?',
    [$phone]
);
$returnedOrders = count_query(
    $pdo,
    "SELECT COUNT(*) FROM replacements r JOIN orders o ON o.id = r.order_id
     WHERE o.customer_phone = ? AND r.status = 'Replacement Delivered'",
    [$phone]
);

// "Last Updated" = the most recent point this customer's order/replacement
// history actually changed, not just "now" (which would be trivial —
// it's always now, on every page load).
$lastOrderStmt = $pdo->prepare('SELECT MAX(created_at) FROM orders WHERE customer_phone = ?');
$lastOrderStmt->execute([$phone]);
$lastOrderAt = $lastOrderStmt->fetchColumn();

$lastReplacementStmt = $pdo->prepare(
    'SELECT MAX(r.updated_at) FROM replacements r JOIN orders o ON o.id = r.order_id WHERE o.customer_phone = ?'
);
$lastReplacementStmt->execute([$phone]);
$lastReplacementAt = $lastReplacementStmt->fetchColumn();

$candidates = array_filter([$lastOrderAt, $lastReplacementAt]);
$lastUpdated = $candidates ? max($candidates) : null; // 'Y-m-d H:i:s' strings sort correctly lexicographically

$trust = compute_trust_score($totalOrders, $cancelledOrders, $returnedOrders, $replacementRequests, $failedOrders);

send_json([
    'phone'               => $phone,
    'customerId'          => $customer['id'] ?? null,
    'totalOrders'         => $totalOrders,
    'cancelledOrders'     => $cancelledOrders,
    'returnedOrders'      => $returnedOrders,
    'replacementRequests' => $replacementRequests,
    'failedOrders'        => $failedOrders,
    'trustScore'          => $trust['score'],
    'trustLevel'          => $trust['level'], // GOOD | MEDIUM_RISK | RISKY
    'lastUpdated'         => $lastUpdated ? (new DateTime($lastUpdated))->format(DATE_ATOM) : null,
]);
