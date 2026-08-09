<?php
require __DIR__ . '/config.php';

function row_to_order(array $r): array
{
    $createdAt = null;
    if (!empty($r['created_at'])) {
        $createdAt = (new DateTime($r['created_at']))->format(DATE_ATOM);
    }
    return [
        'id'            => $r['id'],
        'customerPhone' => $r['customer_phone'],
        'status'        => $r['status'],
        'items'         => decode_json_column($r['items']),
        'address'       => decode_json_column($r['address'], new stdClass()),
        'paymentMethod' => $r['payment_method'],
        'subtotal'      => (float) $r['subtotal'],
        'discountTotal' => (float) $r['discount_total'],
        'deliveryFee'   => (float) $r['delivery_fee'],
        'total'         => (float) $r['total'],
        'shipping'      => decode_json_column($r['shipping'], null),
        'createdAt'     => $createdAt,
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            send_json($row ? row_to_order($row) : null);
        }
        $stmt = $pdo->query('SELECT * FROM orders ORDER BY created_at DESC');
        send_json(array_map('row_to_order', $stmt->fetchAll()));
        break;

    case 'POST':
        $data = request_body();
        if (empty($data['items'])) send_error('Order must contain at least one item.');

        // Retry on the (very unlikely) chance of an order-id collision.
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $newId = generate_order_id();
            $exists = $pdo->prepare('SELECT 1 FROM orders WHERE id = ?');
            $exists->execute([$newId]);
            if (!$exists->fetch()) break;
        }

        $pdo->prepare(
            'INSERT INTO orders (id, customer_phone, status, items, address, payment_method, subtotal, discount_total, delivery_fee, total, shipping)
             VALUES (?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $newId,
            $data['customerPhone'] ?? null,
            'Pending',
            json_encode($data['items']),
            json_encode($data['address'] ?? []),
            $data['paymentMethod'] ?? '',
            $data['subtotal'] ?? 0,
            $data['discountTotal'] ?? 0,
            $data['deliveryFee'] ?? 0,
            $data['total'] ?? 0,
            null,
        ]);

        $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$newId]);
        send_json(row_to_order($stmt->fetch()), 201);
        break;

    case 'PUT':
        if (!$id) send_error('Order id is required.');
        $data = request_body();

        $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) send_error('Order not found.', 404);

        $sets = [];
        $values = [];
        if (array_key_exists('status', $data)) {
            $sets[] = 'status = ?';
            $values[] = $data['status'];
        }
        if (array_key_exists('shipping', $data)) {
            // Merge, not replace — matches the frontend's updateOrderShipping,
            // which folds a partial patch (e.g. just a tracking ID) into
            // whatever shipping info the order already has.
            $current = decode_json_column($existing['shipping']);
            $merged = array_merge($current, $data['shipping']);
            $sets[] = 'shipping = ?';
            $values[] = json_encode($merged);
        }

        if ($sets) {
            $values[] = $id;
            $pdo->prepare('UPDATE orders SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);
        }

        $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$id]);
        send_json(row_to_order($stmt->fetch()));
        break;

    default:
        send_error('Method not allowed.', 405);
}
