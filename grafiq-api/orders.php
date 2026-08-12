<?php
require __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            $row = fetch_order_row($pdo, $id);
            if (!$row) send_json(null);

            // Either a signed-in admin (sees any order) or the signed-in
            // customer this order actually belongs to (sees only their
            // own) — never an anonymous request. Checked here rather
            // than trusting a phone/id the client could just supply.
            if (!optional_admin($pdo)) {
                $phone = require_customer($pdo);
                if ($row['customer_phone'] !== $phone) {
                    send_error('This order does not belong to you.', 403);
                }
            }

            send_json(row_to_order($row));
        }

        // No id = the full order list — admin-only (this is what backs
        // the admin Dashboard/Orders pages). There's no "list my orders"
        // via this branch; that's a separate, session-scoped query — see
        // the `mine=1` branch below.
        if (!empty($_GET['mine'])) {
            $phone = require_customer($pdo);
            $stmt = $pdo->prepare(order_select_sql('WHERE o.customer_phone = ?') . ' ORDER BY o.created_at DESC');
            $stmt->execute([$phone]);
            send_json(array_map('row_to_order', $stmt->fetchAll()));
        }

        require_admin($pdo);
        $stmt = $pdo->query(order_select_sql() . ' ORDER BY o.created_at DESC');
        send_json(array_map('row_to_order', $stmt->fetchAll()));
        break;

    case 'POST':
        // Who's placing this order comes from their verified session,
        // never from a customerPhone field in the body — otherwise
        // anyone could place an order "as" any phone number.
        $phone = require_customer($pdo);

        $data = request_body();

        $settingsRow = $pdo->query('SELECT * FROM settings WHERE id = 1')->fetch();
        if (!$settingsRow) send_error('Settings row missing — did you import schema.sql?', 500);

        $paymentMethod = $data['paymentMethod'] ?? '';
        $codAdvancePercent = (float) ($settingsRow['cod_advance_percent'] ?? 0);
        if ($paymentMethod === 'COD' && $codAdvancePercent > 0) {
            // This store requires an upfront advance on COD orders right
            // now — that has to go through razorpay_verify.php (which
            // charges + verifies the advance) instead of straight here,
            // otherwise a client could place a COD order for the full
            // amount and skip the advance entirely.
            send_error('This order needs an advance payment to confirm — please use the payment flow shown at checkout.', 400);
        }

        try {
            $totals = compute_order_totals($pdo, $data['items'] ?? [], $settingsRow);
        } catch (RuntimeException $e) {
            send_error($e->getMessage());
        }

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
            'INSERT INTO orders (id, customer_phone, customer_email, customer_ip, status, status_history, items, address, payment_method, payment_status, subtotal, discount_total, delivery_fee, total, advance_amount, advance_paid, shipping)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $newId,
            $phone,
            $email ?: null,
            client_ip(),
            'Pending',
            json_encode($initialHistory),
            json_encode($totals['items']),
            json_encode($data['address'] ?? []),
            $paymentMethod,
            'unpaid', // COD orders are collected on delivery; online payments go through razorpay_verify.php instead of here
            $totals['subtotal'],
            $totals['discountTotal'],
            $totals['deliveryFee'],
            $totals['total'],
            // No advance was collected here — this endpoint is only ever hit
            // for plain COD (settings.codAdvancePercent is 0, enforced
            // above). A COD order that DID need an upfront advance goes
            // through razorpay_verify.php instead, which records the real
            // amount.
            0,
            0,
            null,
        ]);

        $row = fetch_order_row($pdo, $newId);
        send_json(row_to_order($row), 201);
        break;

    case 'PUT':
        require_admin($pdo);
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
