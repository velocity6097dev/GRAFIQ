<?php
require __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            $row = fetch_order_row($pdo, $id);
            send_json($row ? row_to_order($row) : null);
        }
        $stmt = $pdo->query(order_select_sql() . ' ORDER BY o.created_at DESC');
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

        $initialHistory = [['status' => 'Pending', 'at' => (new DateTime())->format(DATE_ATOM)]];
        $email = $data['customerEmail'] ?? ($data['address']['email'] ?? null);

        $pdo->prepare(
            'INSERT INTO orders (id, customer_phone, customer_email, status, status_history, items, address, payment_method, payment_status, subtotal, discount_total, delivery_fee, total, advance_amount, advance_paid, shipping)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $newId,
            $data['customerPhone'] ?? null,
            $email ?: null,
            'Pending',
            json_encode($initialHistory),
            json_encode($data['items']),
            json_encode($data['address'] ?? []),
            $data['paymentMethod'] ?? '',
            'unpaid', // COD orders are collected on delivery; online payments go through razorpay_verify.php instead of here
            $data['subtotal'] ?? 0,
            $data['discountTotal'] ?? 0,
            $data['deliveryFee'] ?? 0,
            $data['total'] ?? 0,
            // No advance was collected here — this endpoint is only ever hit
            // for plain COD (settings.codAdvancePercent is 0). A COD order
            // that DID need an upfront advance goes through
            // razorpay_verify.php instead, which records the real amount.
            0,
            0,
            null,
        ]);

        $row = fetch_order_row($pdo, $newId);
        send_json(row_to_order($row), 201);
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

            $history = decode_json_column($existing['status_history']);
            $sets[] = 'status_history = ?';
            $values[] = json_encode(append_status_history($history, $data['status']));
        }
        if (array_key_exists('paymentStatus', $data)) {
            $sets[] = 'payment_status = ?';
            $values[] = $data['paymentStatus'];
        }
        if (array_key_exists('refundStatus', $data)) {
            $sets[] = 'refund_status = ?';
            $values[] = $data['refundStatus'];
        }
        if (array_key_exists('customerEmail', $data)) {
            $sets[] = 'customer_email = ?';
            $values[] = $data['customerEmail'] ?: null;
        }
        if (array_key_exists('adminNotes', $data)) {
            $sets[] = 'admin_notes = ?';
            $values[] = $data['adminNotes'] ?: null;
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

        $row = fetch_order_row($pdo, $id);
        send_json(row_to_order($row));
        break;

    default:
        send_error('Method not allowed.', 405);
}
