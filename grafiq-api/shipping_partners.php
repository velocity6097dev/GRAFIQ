<?php
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    send_error('Method not allowed.', 405);
}

function row_to_partner(array $r): array
{
    return [
        'id'         => $r['id'],
        'name'       => $r['name'],
        'etaDays'    => $r['eta_days'],
        'baseRate'   => (float) $r['base_rate'],
        'perKgRate'  => (float) $r['per_kg_rate'],
        'rating'     => (float) $r['rating'],
    ];
}

$stmt = $pdo->query('SELECT * FROM shipping_partners');
send_json(array_map('row_to_partner', $stmt->fetchAll()));
