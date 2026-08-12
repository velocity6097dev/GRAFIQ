<?php
require __DIR__ . '/config.php';

// Demo OTP — every phone number receives this same code, same as the
// original frontend-only demo. Swap for a real SMS gateway (MSG91, Twilio
// Verify, Firebase Phone Auth, etc.) when you're ready to go live —
// that's the only thing that needs to change in this file.
const DEMO_OTP = '1234';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
}

$data = request_body();
$action = $data['action'] ?? '';

switch ($action) {
    case 'send_otp':
        $phone = preg_replace('/\D/', '', $data['phone'] ?? '');
        if (!preg_match('/^\d{10}$/', $phone)) {
            send_json(['success' => false, 'message' => 'Enter a valid 10-digit mobile number.']);
        }
        // In production: generate a random code, store it with an expiry,
        // and send it via SMS instead of returning it directly.
        send_json(['success' => true, 'demoOtp' => DEMO_OTP]);
        break;

    case 'verify_otp':
        $phone = preg_replace('/\D/', '', $data['phone'] ?? '');
        $code = $data['code'] ?? '';

        if ($code !== DEMO_OTP) {
            send_json(['success' => false, 'message' => 'Incorrect code. Try again.']);
        }

        // Upsert the customer so returning phone numbers keep their name/history.
        $stmt = $pdo->prepare('SELECT * FROM customers WHERE phone = ?');
        $stmt->execute([$phone]);
        $customer = $stmt->fetch();

        if (!$customer) {
            $newId = generate_id('cust');
            $pdo->prepare('INSERT INTO customers (id, phone, name) VALUES (?, ?, ?)')
                ->execute([$newId, $phone, '']);
            $customer = ['id' => $newId, 'phone' => $phone, 'name' => ''];
        }

        $token = create_customer_session($pdo, $phone);

        send_json([
            'success' => true,
            'token'   => $token,
            'user'    => ['phone' => $customer['phone'], 'name' => $customer['name']],
        ]);
        break;

    // Confirms a stored X-Customer-Token is still valid and returns the
    // current profile — called once on app load, same purpose as
    // admin_auth.php's 'verify' action.
    case 'whoami':
        $phone = require_customer($pdo);
        $stmt = $pdo->prepare('SELECT * FROM customers WHERE phone = ?');
        $stmt->execute([$phone]);
        $customer = $stmt->fetch();
        if (!$customer) send_error('Customer not found.', 404);
        send_json(['success' => true, 'user' => ['phone' => $customer['phone'], 'name' => $customer['name']]]);
        break;

    case 'logout':
        $token = bearer_token_from_header('X-Customer-Token');
        if ($token) {
            $pdo->prepare('DELETE FROM customer_sessions WHERE token = ?')->execute([$token]);
        }
        send_json(['success' => true]);
        break;

    case 'update_profile':
        // Which customer this updates comes from the session, never from
        // a `phone` field in the request body — otherwise anyone could
        // rename any customer just by sending their phone number.
        $phone = require_customer($pdo);

        if (array_key_exists('name', $data)) {
            $pdo->prepare('UPDATE customers SET name = ? WHERE phone = ?')->execute([$data['name'], $phone]);
        }

        $stmt = $pdo->prepare('SELECT * FROM customers WHERE phone = ?');
        $stmt->execute([$phone]);
        $customer = $stmt->fetch();
        if (!$customer) send_error('Customer not found.', 404);

        send_json(['success' => true, 'user' => ['phone' => $customer['phone'], 'name' => $customer['name']]]);
        break;

    default:
        send_error('Unknown action.', 400);
}
