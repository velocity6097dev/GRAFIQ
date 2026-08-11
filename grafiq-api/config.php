<?php
/**
 * GRAFIQ store API — shared config & helpers.
 * Every endpoint file starts with: require __DIR__ . '/config.php';
 *
 * Talks to a local MySQL database via XAMPP. Default XAMPP MySQL is
 * root / (empty password) on localhost — change the constants below if
 * your setup differs.
 */

// ---------- CORS (Vite dev server runs on a different port, so the
// browser treats it as a different origin) ----------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Preflight requests end here. (CLI has no REQUEST_METHOD — that's fine,
// this file is also required by razorpay_queue_worker.php when run from
// a terminal/cron job, not just over HTTP.)
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ---------- Razorpay ----------
// Get your test-mode keys free at https://dashboard.razorpay.com/app/keys
// (no live/business verification needed to test — test mode works
// immediately after signup). Paste them here. Never put the key SECRET
// in any frontend file — it only belongs here, server-side.
const RAZORPAY_KEY_ID = 'rzp_test_XXXXXXXXXXXXXX';
const RAZORPAY_KEY_SECRET = 'YOUR_TEST_KEY_SECRET_HERE';
// Optional: set this up under Settings → Webhooks in the Razorpay
// dashboard if you deploy publicly (see grafiq-api/razorpay_webhook.php).
// Not needed for local XAMPP testing — the queue worker covers that case.
const RAZORPAY_WEBHOOK_SECRET = '';

// ---------- Database connection ----------
const DB_HOST = 'localhost';
const DB_NAME = 'grafiq_store';
const DB_USER = 'root';
const DB_PASS = '';       // default XAMPP MySQL root password is empty
const DB_CHARSET = 'utf8mb4';

$dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
    // Belt-and-braces on top of the DSN's charset=utf8mb4: some XAMPP
    // bundles (especially older Windows builds) ship a PDO/mysqlnd
    // driver that doesn't always honour the DSN charset param, which
    // silently turns ₹ and other multi-byte characters into "?" on
    // INSERT/UPDATE. Explicitly running SET NAMES on every new
    // connection closes that gap regardless of driver quirks.
    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES 'utf8mb4'",
];

try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed. Is XAMPP\'s MySQL running, and did you import schema.sql? (' . $e->getMessage() . ')'
    ]);
    exit;
}

// ---------- Helpers ----------

/** Decoded JSON body of the current request (empty array if none/invalid). */
function request_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

/** Safe json_decode for columns that store JSON text — always returns an array. */
function decode_json_column($value, $fallback = [])
{
    if ($value === null || $value === '') return $fallback;
    $decoded = json_decode($value, true);
    return $decoded === null ? $fallback : $decoded;
}

/** id like "p-m4x1a2-9f3kd" — mirrors the frontend's generateId() format. */
function generate_id(string $prefix = 'id'): string
{
    $time = base_convert((string) floor(microtime(true) * 1000), 10, 36);
    $rand = substr(bin2hex(random_bytes(4)), 0, 5);
    return "{$prefix}-{$time}-{$rand}";
}

/** GRQ123456 — mirrors the frontend's generateOrderId() format. */
function generate_order_id(): string
{
    return 'GRQ' . random_int(100000, 999999);
}

function slugify(string $text): string
{
    $text = strtolower(trim($text));
    $text = preg_replace('/[^a-z0-9]+/', '-', $text);
    return trim($text, '-');
}

function send_json($data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function send_error(string $message, int $status = 400): void
{
    send_json(['error' => $message], $status);
}

/**
 * Appends a {status, at} entry to a status_history JSON column's decoded
 * array, but only if the status actually changed — repeated PUTs with
 * the same status (e.g. an admin re-saving a form) shouldn't pad the
 * timeline with duplicate entries. Returns the updated array ready for
 * json_encode.
 */
function append_status_history(array $currentHistory, string $newStatus): array
{
    $last = end($currentHistory);
    if ($last && ($last['status'] ?? null) === $newStatus) {
        return $currentHistory; // no-op: status didn't actually change
    }
    $currentHistory[] = ['status' => $newStatus, 'at' => (new DateTime())->format(DATE_ATOM)];
    return $currentHistory;
}

function razorpay_configured(): bool
{
    return RAZORPAY_KEY_ID !== 'rzp_test_XXXXXXXXXXXXXX' && RAZORPAY_KEY_SECRET !== 'YOUR_TEST_KEY_SECRET_HERE';
}

/**
 * Best-effort client IP, logged on order creation (orders.customer_ip)
 * for the admin order page's Customer Security panel. NOT suitable for
 * access-control/fraud decisions on its own — X-Forwarded-For is
 * trivially spoofable by the client sending the request — it's only
 * ever used here for an admin's own visual review of an order.
 */
function client_ip(): ?string
{
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? null;
    if ($forwarded) {
        // First entry in a comma-separated chain is the original client.
        $ip = trim(explode(',', $forwarded)[0]);
        if ($ip !== '') return $ip;
    }
    return $_SERVER['REMOTE_ADDR'] ?? null;
}

/**
 * Base SELECT for `orders`, left-joined to its most recent `payments` row
 * (correlated subquery picks the latest by created_at). Every endpoint
 * that returns order(s) — orders.php, razorpay_verify.php,
 * order_cancel.php, payment_action.php — shares this + row_to_order()
 * below so the shape returned to the frontend never drifts between them.
 */
function order_select_sql(string $where = ''): string
{
    return "SELECT o.*,
                lp.razorpay_order_id   AS p_razorpay_order_id,
                lp.razorpay_payment_id AS p_razorpay_payment_id,
                lp.amount              AS p_amount,
                lp.status              AS p_status,
                lp.verified_at         AS p_verified_at,
                lp.created_at          AS p_payment_created_at,
                cu.id                  AS cu_customer_id
            FROM orders o
            LEFT JOIN payments lp ON lp.id = (
                SELECT p2.id FROM payments p2 WHERE p2.order_id = o.id ORDER BY p2.created_at DESC LIMIT 1
            )
            LEFT JOIN customers cu ON cu.phone = o.customer_phone
            $where";
}

function fetch_order_row(PDO $pdo, string $id): ?array
{
    $stmt = $pdo->prepare(order_select_sql('WHERE o.id = ?'));
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row ?: null;
}

/**
 * Shared order → API-shape mapper. `r` is a row from order_select_sql()
 * (i.e. already carries the joined p_* payment columns, possibly all
 * NULL if this order has no payments row).
 */
function row_to_order(array $r): array
{
    $createdAt = !empty($r['created_at']) ? (new DateTime($r['created_at']))->format(DATE_ATOM) : null;
    $cancelledAt = !empty($r['cancelled_at']) ? (new DateTime($r['cancelled_at']))->format(DATE_ATOM) : null;

    $payment = null;
    if (!empty($r['p_razorpay_payment_id']) || !empty($r['p_razorpay_order_id'])) {
        $payment = [
            'razorpayOrderId'   => $r['p_razorpay_order_id'],
            'razorpayPaymentId' => $r['p_razorpay_payment_id'],
            'amount'            => $r['p_amount'] !== null ? (float) $r['p_amount'] : null,
            'status'            => $r['p_status'],
            'verifiedAt'        => !empty($r['p_verified_at']) ? (new DateTime($r['p_verified_at']))->format(DATE_ATOM) : null,
            'createdAt'         => !empty($r['p_payment_created_at']) ? (new DateTime($r['p_payment_created_at']))->format(DATE_ATOM) : null,
        ];
    }

    return [
        'id'                 => $r['id'],
        'customerPhone'      => $r['customer_phone'],
        'customerEmail'      => $r['customer_email'] ?? null,
        // Joined from `customers` by phone (see order_select_sql) — the
        // stable customer record id, distinct from this order's own id.
        'customerId'         => $r['cu_customer_id'] ?? null,
        // IP address the order was placed from (see client_ip()) —
        // shown in the admin order page's Customer Security panel.
        // NULL for any order placed before this column existed.
        'customerIp'         => $r['customer_ip'] ?? null,
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
        // Non-refundable COD advance (see partial-COD feature): amount
        // collected upfront online, ahead of shipping, when
        // settings.codAdvancePercent > 0 at the time this order was placed.
        'advanceAmount'      => (float) ($r['advance_amount'] ?? 0),
        'advancePaid'        => (bool) ($r['advance_paid'] ?? 0),
        'shipping'           => decode_json_column($r['shipping'], null),
        'cancelledAt'        => $cancelledAt,
        'cancellationReason' => $r['cancellation_reason'],
        'refundStatus'       => $r['refund_status'],
        'adminNotes'         => $r['admin_notes'] ?? null,
        'payment'            => $payment,
        'createdAt'          => $createdAt,
    ];
}

/**
 * Calls Razorpay's REST API (https://api.razorpay.com/v1/...) with your
 * key_id/key_secret as HTTP Basic Auth, exactly as their docs specify.
 * Returns [httpStatusCode, decodedJsonBody]. Throws RuntimeException if
 * the request couldn't be made at all (network/DNS/curl failure) —
 * that's different from Razorpay responding with an error status, which
 * callers should check via the returned status code instead.
 */
function razorpay_request(string $method, string $path, ?array $body = null): array
{
    $ch = curl_init('https://api.razorpay.com/v1' . $path);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD        => RAZORPAY_KEY_ID . ':' . RAZORPAY_KEY_SECRET,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 15,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $response = curl_exec($ch);
    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException("Could not reach Razorpay: $error");
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode($response, true);
    return [$status, is_array($decoded) ? $decoded : []];
}
