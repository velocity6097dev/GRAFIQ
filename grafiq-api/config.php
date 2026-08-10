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
