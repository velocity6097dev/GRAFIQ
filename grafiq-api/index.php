<?php
require __DIR__ . '/config.php';

$counts = [];
foreach (['products', 'categories', 'banners', 'orders', 'admin_users', 'customers'] as $table) {
    $counts[$table] = (int) $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
}

send_json([
    'status'  => 'ok',
    'message' => 'GRAFIQ API is running and connected to MySQL.',
    'counts'  => $counts,
    'endpoints' => [
        'GET/POST/PUT/DELETE /products.php',
        'GET/POST/PUT/DELETE /categories.php',
        'GET/POST/PUT/DELETE /banners.php',
        'GET/PUT /settings.php',
        'GET/POST/PUT /orders.php',
        'POST /shiprocket_action.php',
        'POST /admin_auth.php',
        'POST /customer_auth.php',
    ],
]);
