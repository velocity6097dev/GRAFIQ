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
        'GET /products.php · POST/PUT/DELETE /products.php (admin)',
        'GET /categories.php · POST/PUT/DELETE /categories.php (admin)',
        'GET /banners.php · POST/PUT/DELETE /banners.php (admin)',
        'GET /settings.php · PUT /settings.php (admin)',
        'GET /orders.php?mine=1 (customer) · GET/POST /orders.php (customer) · GET (list)/PUT /orders.php (admin)',
        'POST /order_cancel.php (customer)',
        'GET /replacements.php?mine=1 (customer) · POST /replacements.php (customer) · GET (list)/PUT /replacements.php (admin)',
        'POST /razorpay_create_order.php · POST /razorpay_verify.php (customer)',
        'POST /shiprocket_action.php (admin)',
        'GET /customer_trust.php (admin)',
        'POST /payment_action.php (admin)',
        'POST /admin_auth.php — {action: login|verify|logout}',
        'POST /customer_auth.php — {action: send_otp|verify_otp|whoami|logout|update_profile}',
    ],
]);
