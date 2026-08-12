<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
}

$data = request_body();
$action = $data['action'] ?? 'login';

switch ($action) {
    // Confirms a stored X-Admin-Token is still valid — called once on
    // app load so a stale/expired token gets cleared client-side
    // straight away instead of failing confusingly on the first real
    // admin action.
    case 'verify':
        $session = require_admin($pdo);
        send_json(['success' => true, 'username' => $session['username']]);
        break;

    case 'logout':
        $token = bearer_token_from_header('X-Admin-Token');
        if ($token) {
            $pdo->prepare('DELETE FROM admin_sessions WHERE token = ?')->execute([$token]);
        }
        send_json(['success' => true]);
        break;

    case 'login':
    default:
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';

        if ($username === '' || $password === '') {
            send_json(['success' => false, 'message' => 'Username and password are required.']);
        }

        $stmt = $pdo->prepare('SELECT * FROM admin_users WHERE username = ?');
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password_hash'])) {
            $token = create_admin_session($pdo, $admin['username']);
            send_json(['success' => true, 'username' => $admin['username'], 'token' => $token]);
        }

        send_json(['success' => false, 'message' => 'Incorrect username or password.']);
}
