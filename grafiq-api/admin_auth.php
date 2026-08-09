<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
}

$data = request_body();
$username = trim($data['username'] ?? '');
$password = $data['password'] ?? '';

if ($username === '' || $password === '') {
    send_json(['success' => false, 'message' => 'Username and password are required.']);
}

$stmt = $pdo->prepare('SELECT * FROM admin_users WHERE username = ?');
$stmt->execute([$username]);
$admin = $stmt->fetch();

if ($admin && password_verify($password, $admin['password_hash'])) {
    send_json(['success' => true, 'username' => $admin['username']]);
}

send_json(['success' => false, 'message' => 'Incorrect username or password.']);
