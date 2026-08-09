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

// Preflight requests end here.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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
