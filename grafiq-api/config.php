<?php
/**
 * GRAFIQ store API — shared config & helpers.
 * Every endpoint file starts with: require __DIR__ . '/config.php';
 *
 * Talks to MySQL — locally via XAMPP by default (see DB_HOST etc. below),
 * or your real host's MySQL once this is deployed (InfinityFree and
 * similar). Default XAMPP MySQL is root / (empty password) on localhost
 * — change the DB_* constants below if your setup differs.
 */

// ---------- CORS (Vite dev server runs on a different port, so the
// browser treats it as a different origin) ----------
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token, X-Customer-Token');
header('Content-Type: application/json; charset=UTF-8');

// Preflight requests end here. (CLI has no REQUEST_METHOD — that's fine,
// this file is also required by razorpay_queue_worker.php when run from
// a terminal/cron job, not just over HTTP.)
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ---------- Always return JSON, never leak a raw PHP/MySQL error ----------
// Shared hosting (this app is commonly deployed to free tiers like
// InfinityFree, which is intermittently flaky about MySQL — connection
// limits, brief drops, the odd restart) can produce two very different
// failure shapes if left unhandled: an uncaught PDOException (e.g. MySQL
// dropping mid-request, which is a *query* failing, not just the initial
// connect) turns into a raw PHP fatal-error HTML page, and any stray
// PHP warning/notice printed before send_json()'s json_encode() call
// corrupts the JSON stream even on an otherwise-successful request. Both
// show up client-side as "the API returned a non-JSON response". Neither
// should ever reach a person's browser, and a raw MySQL error message
// (which can include the DB host/user) definitely shouldn't either.
//
// display_errors=0 stops PHP's own output from leaking into a response
// body; the exception handler + shutdown function below are what turn
// *any* otherwise-uncaught error anywhere in any endpoint — not just the
// DB connection below — into a clean JSON response instead. The detail
// still goes to the server's error log via error_log(), so it's not lost
// for actual debugging, just never shown to the person using the site.
error_reporting(E_ALL);
ini_set('display_errors', '0');

/**
 * The one place that turns "something broke" into the JSON body every
 * endpoint is expected to return. `transient` tells the frontend this is
 * the kind of failure worth quietly retrying (a DB hiccup) rather than
 * giving up immediately — see the retry logic in src/api/client.js.
 */
function fail_gracefully(string $logDetail, int $status = 500, bool $transient = false): void
{
    error_log('[grafiq-api] ' . $logDetail);
    if (!headers_sent()) {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
    }
    echo json_encode([
        'error'     => 'Something went wrong on our end — please try again in a moment.',
        'transient' => $transient,
    ]);
    exit;
}

set_exception_handler(function (Throwable $e) {
    // A dropped/expired MySQL connection mid-query throws a PDOException
    // here too (not just at the initial connect below) — treat those as
    // transient the same way, since a retry from the top of the request
    // would very likely succeed.
    $transient = $e instanceof PDOException;
    fail_gracefully(get_class($e) . ': ' . $e->getMessage(), $transient ? 503 : 500, $transient);
});

register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        fail_gracefully("Fatal: {$error['message']} in {$error['file']}:{$error['line']}");
    }
});

// ---------- Razorpay ----------
// Get your test-mode keys free at https://dashboard.razorpay.com/app/keys
// (no live/business verification needed to test — test mode works
// immediately after signup). Paste them here. Never put the key SECRET
// in any frontend file — it only belongs here, server-side.
const RAZORPAY_KEY_ID = 'kwy';
const RAZORPAY_KEY_SECRET = 'secret';
// Optional: set this up under Settings → Webhooks in the Razorpay
// dashboard if you deploy publicly (see grafiq-api/razorpay_webhook.php).
// Not needed for local XAMPP testing — the queue worker covers that case.
const RAZORPAY_WEBHOOK_SECRET = '';

// ---------- Shiprocket ----------
// Create a dedicated API user under Shiprocket Panel → Settings → API →
// "Add New API User" (do NOT use your normal Shiprocket login here) and
// paste its email/password below. See SHIPROCKET_SETUP.md for the full
// walkthrough, including where to find the two values below it.
const SHIPROCKET_EMAIL = 'email';
const SHIPROCKET_PASSWORD = 'api password';
// Exactly as it appears under Settings → Pickup Addresses in your
// Shiprocket dashboard — the address's "Nickname", not the address text.
const SHIPROCKET_PICKUP_LOCATION = 'Home';
// That same pickup address's 6-digit pincode. Kept separate from the
// nickname above because the rate-check API needs an actual postcode,
// not a name.
const SHIPROCKET_PICKUP_PINCODE = '743165';
// Rough parcel dimensions in cm used when booking a shipment — there's no
// per-product dimension/weight data in this store yet, so every order
// books with the same box size. Tune these to whatever a typical GRAFIQ
// order looks like once packed; weight itself is still estimated per
// order from item count (see estimate_weight_kg() below).
const SHIPROCKET_DEFAULT_LENGTH = 15;
const SHIPROCKET_DEFAULT_BREADTH = 12;
const SHIPROCKET_DEFAULT_HEIGHT = 3;

const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external';

function shiprocket_configured(): bool
{
    return SHIPROCKET_EMAIL !== 'YOUR_SHIPROCKET_API_USER_EMAIL'
        && SHIPROCKET_PASSWORD !== 'YOUR_SHIPROCKET_API_USER_PASSWORD'
        && SHIPROCKET_PICKUP_PINCODE !== '000000';
}

/**
 * Mirrors estimateWeightKg() in src/utils/shipping.js so the live
 * Shiprocket rate-check and the (now-retired) mock quotes were always
 * estimating weight the same way. Rough model: 0.3kg per item, floored
 * at 0.5kg for a single small item.
 */
function estimate_weight_kg(array $order): float
{
    $items = decode_json_column($order['items'] ?? null, []);
    $totalQty = array_reduce($items, fn($sum, $i) => $sum + (int) ($i['qty'] ?? 0), 0) ?: 1;
    return max(0.5, round($totalQty * 0.3, 1));
}

/**
 * Returns a valid bearer token for the Shiprocket API. Tokens are valid
 * 240 hours (10 days) per Shiprocket's docs — cached in the single-row
 * `shiprocket_auth` table (same singleton-row pattern as `settings`) so
 * every request doesn't re-authenticate, and refreshed a bit early (230h)
 * to leave a safety margin. Throws RuntimeException on failure.
 */
function shiprocket_get_token(PDO $pdo): string
{
    $row = $pdo->query('SELECT token, expires_at FROM shiprocket_auth WHERE id = 1')->fetch();
    if ($row && !empty($row['token']) && strtotime($row['expires_at']) > time() + 3600) {
        return $row['token'];
    }

    $ch = curl_init(SHIPROCKET_BASE . '/auth/login');
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => 'POST',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode(['email' => SHIPROCKET_EMAIL, 'password' => SHIPROCKET_PASSWORD]),
        CURLOPT_TIMEOUT        => 15,
    ]);
    $response = curl_exec($ch);
    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException("Could not reach Shiprocket: $error");
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $body = json_decode($response, true);

    if ($status < 200 || $status >= 300 || empty($body['token'])) {
        $message = $body['message'] ?? 'Shiprocket rejected the login — double check the API user email/password in config.php.';
        throw new RuntimeException($message);
    }

    $expiresAt = (new DateTime('+230 hours'))->format('Y-m-d H:i:s');
    $pdo->prepare(
        'INSERT INTO shiprocket_auth (id, token, expires_at) VALUES (1, ?, ?)
         ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)'
    )->execute([$body['token'], $expiresAt]);

    return $body['token'];
}

/**
 * Calls Shiprocket's REST API (https://apiv2.shiprocket.in/v1/external/...)
 * with a cached bearer token — same shape as razorpay_request() above.
 * Automatically clears the cached token and retries once on a 401 (covers
 * the token having been invalidated on Shiprocket's side before our own
 * 230h cache expiry). Returns [httpStatusCode, decodedJsonBody].
 */
function shiprocket_request(PDO $pdo, string $method, string $path, ?array $body = null, ?array $query = null, bool $allowRetry = true): array
{
    $token = shiprocket_get_token($pdo);
    $url = SHIPROCKET_BASE . $path;
    if ($query) $url .= '?' . http_build_query($query);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json', "Authorization: Bearer $token"],
        CURLOPT_TIMEOUT        => 25,
    ]);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    }

    $response = curl_exec($ch);
    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException("Could not reach Shiprocket: $error");
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $decoded = json_decode($response, true);

    if ($status === 401 && $allowRetry) {
        $pdo->prepare('DELETE FROM shiprocket_auth WHERE id = 1')->execute();
        return shiprocket_request($pdo, $method, $path, $body, $query, false);
    }

    return [$status, is_array($decoded) ? $decoded : []];
}

// ---------- Database connection ----------
// XAMPP defaults (localhost / root / empty password) — if this is
// deployed to real hosting (InfinityFree, etc.), these four need to be
// that host's actual DB credentials instead, which is nearly always a
// hostname that is NOT "localhost" (something like sqlXXX.epizy.com),
// a username/database prefixed with your account id, and a real
// password — check your host's control panel / MySQL Databases page.
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
    // A couple of seconds, not PHP's default (which can be a long, silent
    // hang on shared hosting when MySQL is genuinely unreachable) — fails
    // fast enough that the retry loop below still returns quickly instead
    // of a request just hanging.
    PDO::ATTR_TIMEOUT             => 5,
];

// Shared hosting (InfinityFree and similar free tiers especially) can
// have brief MySQL hiccups — a connection-limit blip, a restart, a
// dropped connection — where trying again half a second later succeeds
// fine. Retrying a couple of times here, inside the same request, is
// what actually fixes "it works if I just refresh" instead of just
// hiding it — most transient blips never even reach the person as an
// error at all now.
$pdo = null;
$lastConnectionError = null;
for ($attempt = 1; $attempt <= 3; $attempt++) {
    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        break;
    } catch (PDOException $e) {
        $lastConnectionError = $e;
        if ($attempt < 3) {
            usleep(300000 * $attempt); // 300ms, then 600ms
        }
    }
}

if (!$pdo) {
    fail_gracefully('DB connection failed after 3 attempts: ' . $lastConnectionError->getMessage(), 503, true);
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

// ---------- Auth (admin + customer sessions) ----------
//
// Login/OTP-verify endpoints (admin_auth.php, customer_auth.php) issue an
// opaque random token, stored server-side in admin_sessions /
// customer_sessions with an expiry. The frontend sends it back on every
// request as a custom header — X-Admin-Token for admin actions,
// X-Customer-Token for actions scoped to a signed-in customer — and
// every endpoint that needs to enforce who's allowed to do something
// calls require_admin() or require_customer() below to check it, rather
// than trusting anything the client claims about itself (a `phone`
// field, an `isAdmin` flag, etc.) in the request body.

const ADMIN_SESSION_DAYS = 7;
const CUSTOMER_SESSION_DAYS = 30;

/** 64 hex chars of randomness — used as an opaque session token. */
function generate_token(): string
{
    return bin2hex(random_bytes(32));
}

function bearer_token_from_header(string $headerName): ?string
{
    $key = 'HTTP_' . strtoupper(str_replace('-', '_', $headerName));
    $value = trim($_SERVER[$key] ?? '');
    return $value !== '' ? $value : null;
}

function create_admin_session(PDO $pdo, string $username): string
{
    $token = generate_token();
    $expiresAt = (new DateTime('+' . ADMIN_SESSION_DAYS . ' days'))->format('Y-m-d H:i:s');
    $pdo->prepare('INSERT INTO admin_sessions (token, username, expires_at) VALUES (?, ?, ?)')
        ->execute([$token, $username, $expiresAt]);
    return $token;
}

function create_customer_session(PDO $pdo, string $phone): string
{
    $token = generate_token();
    $expiresAt = (new DateTime('+' . CUSTOMER_SESSION_DAYS . ' days'))->format('Y-m-d H:i:s');
    $pdo->prepare('INSERT INTO customer_sessions (token, phone, expires_at) VALUES (?, ?, ?)')
        ->execute([$token, $phone, $expiresAt]);
    return $token;
}

/**
 * Every admin-only endpoint (or admin-only branch of an endpoint) calls
 * this first. Exits with 401 via send_error() if there's no valid,
 * unexpired admin session — callers don't need to check a return value,
 * anything after this line only runs for a real signed-in admin.
 */
function require_admin(PDO $pdo): array
{
    $token = bearer_token_from_header('X-Admin-Token');
    if (!$token) send_error('Admin sign-in required.', 401);

    $stmt = $pdo->prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > NOW()');
    $stmt->execute([$token]);
    $session = $stmt->fetch();
    if (!$session) send_error('Your admin session has expired — please sign in again.', 401);

    return $session;
}

/**
 * Same lookup as require_admin(), but returns null instead of exiting
 * when there's no valid session — for endpoints an admin and a customer
 * both legitimately hit (e.g. looking up a single order), where the
 * caller decides what to do next rather than always requiring an admin.
 */
function optional_admin(PDO $pdo): ?array
{
    $token = bearer_token_from_header('X-Admin-Token');
    if (!$token) return null;
    $stmt = $pdo->prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > NOW()');
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

/**
 * Every endpoint that needs to know *which* customer is making the
 * request calls this — returns the verified phone number straight from
 * the session, which is what callers should use everywhere they'd
 * otherwise be tempted to read a `phone`/`customerPhone` field out of
 * the request body (that field is never trustworthy — the whole point
 * of this function is that the phone comes from something the client
 * can't simply type in). Exits with 401 if there's no valid session.
 */
function require_customer(PDO $pdo): string
{
    $token = bearer_token_from_header('X-Customer-Token');
    if (!$token) send_error('Please verify your phone number to continue.', 401);

    $stmt = $pdo->prepare('SELECT * FROM customer_sessions WHERE token = ? AND expires_at > NOW()');
    $stmt->execute([$token]);
    $session = $stmt->fetch();
    if (!$session) send_error('Your session has expired — please verify your phone number again.', 401);

    return $session['phone'];
}

// ---------- Order pricing (server-side, never trust a client-supplied
// amount — see the P0 finding this closes: "Razorpay order creation
// accepts arbitrary client-supplied amount", which applies just as much
// to the plain Cash-on-Delivery path through orders.php) ----------

// Mirrors src/pages/DesignYourOwn.jsx's BASE_GARMENTS/PLACEMENTS tables —
// the "Design Your Own" flow prices a custom item from these two small
// tables client-side rather than a real catalog row, so this is the
// authoritative copy used to price them server-side too. Keep both in
// sync if you ever change prices in DesignYourOwn.jsx.
const CUSTOM_GARMENT_PRICES = ['tee' => 599, 'oversized' => 749, 'hoodie' => 1499];
const CUSTOM_PLACEMENT_FEES = ['front' => 0, 'back' => 100, 'both' => 180];

/**
 * Recomputes an authoritative subtotal/discount/delivery-fee/total from
 * a cart's line items, fresh from the database — this is the one place
 * that decides what an order actually costs. A client can send whatever
 * it wants in `price`, `discount`, `subtotal`, `total`, etc. (browser
 * devtools, a raw API call, whatever); none of it is used. Every catalog
 * item's price/discount is looked up by productId in `products`; every
 * custom "Design Your Own" item is priced from CUSTOM_GARMENT_PRICES/
 * CUSTOM_PLACEMENT_FEES above. Also checks stock, so this doubles as the
 * one place that rejects "add 9999 of something with only 3 in stock".
 *
 * Returns ['items' => sanitizedItems, 'subtotal' => .., 'discountTotal'
 * => .., 'deliveryFee' => .., 'total' => ..]. Throws RuntimeException
 * (callers should turn that into a 400 via send_error) on anything
 * invalid — a discontinued product, a garbage quantity, a custom item
 * that no longer matches a known garment/placement, etc.
 */
function compute_order_totals(PDO $pdo, array $items, array $settings): array
{
    if (!$items) throw new RuntimeException('Order must contain at least one item.');

    $sanitized = [];
    $subtotal = 0.0;
    $discountTotal = 0.0;

    foreach ($items as $item) {
        $qty = (int) ($item['qty'] ?? 0);
        if ($qty < 1 || $qty > 50) {
            throw new RuntimeException('Each item needs a quantity between 1 and 50.');
        }

        $isCustom = !empty($item['isCustom']);

        if ($isCustom) {
            $garmentId = $item['garmentId'] ?? null;
            // Older cart items (already in someone's browser localStorage
            // from before this field existed) only have it embedded in
            // the productId, e.g. "custom-hoodie-1730000000000".
            if (!$garmentId && preg_match('/^custom-([a-z]+)-\d+$/', (string) ($item['productId'] ?? ''), $m)) {
                $garmentId = $m[1];
            }
            $placement = $item['customDesign']['placement'] ?? null;

            if (!isset(CUSTOM_GARMENT_PRICES[$garmentId]) || !isset(CUSTOM_PLACEMENT_FEES[$placement])) {
                throw new RuntimeException('One of the custom items in your cart is no longer valid — please remove and re-add it.');
            }

            $price = CUSTOM_GARMENT_PRICES[$garmentId] + CUSTOM_PLACEMENT_FEES[$placement];
            $discount = 0;
            $name = $item['name'] ?? 'Custom Item';
            $image = $item['image'] ?? null;
        } else {
            $productId = $item['productId'] ?? null;
            if (!$productId) throw new RuntimeException('One of the items in your cart is missing a product.');

            $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
            $stmt->execute([$productId]);
            $product = $stmt->fetch();
            if (!$product) {
                throw new RuntimeException("An item in your cart is no longer available — please remove it and try again.");
            }
            if ((int) $product['stock'] < $qty) {
                throw new RuntimeException("Only {$product['stock']} of \"{$product['name']}\" left in stock — please adjust the quantity.");
            }

            $price = (float) $product['price'];
            $discount = (int) $product['discount'];
            $name = $product['name'];
            $images = decode_json_column($product['images']);
            $image = $images[0] ?? null;
        }

        // Same rounding as getDiscountedPrice() in src/utils/format.js —
        // round the per-unit discounted price once, then multiply by qty,
        // so this matches the total the customer saw on screen exactly.
        $unitFinal = $discount > 0 ? round($price - ($price * $discount / 100)) : $price;
        $subtotal += $price * $qty;
        $discountTotal += ($price - $unitFinal) * $qty;

        $sanitized[] = [
            'lineId'       => $item['lineId'] ?? null,
            'productId'    => $item['productId'] ?? null,
            'name'         => $name,
            'image'        => $image,
            'price'        => $price,
            'discount'     => $discount,
            'size'         => $item['size'] ?? null,
            'color'        => $item['color'] ?? null,
            'qty'          => $qty,
            'isCustom'     => $isCustom,
            'customDesign' => $item['customDesign'] ?? null,
        ];
    }

    $payable = $subtotal - $discountTotal;
    $freeDeliveryAbove = (float) ($settings['free_delivery_above'] ?? 0);
    $deliveryFee = ($payable <= 0 || $payable >= $freeDeliveryAbove) ? 0.0 : (float) ($settings['delivery_fee'] ?? 0);
    $total = $payable + $deliveryFee;

    return [
        'items'         => $sanitized,
        'subtotal'      => round($subtotal, 2),
        'discountTotal' => round($discountTotal, 2),
        'deliveryFee'   => round($deliveryFee, 2),
        'total'         => round($total, 2),
    ];
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
