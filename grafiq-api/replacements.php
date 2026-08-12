<?php
require __DIR__ . '/config.php';

// Only orders in this status are eligible for a replacement request —
// enforced here server-side (POST handler below), not just by hiding
// the button once the order shows as Delivered on the frontend.
const REPLACEMENT_ELIGIBLE_STATUS = 'Delivered';

function row_to_replacement(array $r): array
{
    $createdAt = $r['created_at'] ? (new DateTime($r['created_at']))->format(DATE_ATOM) : null;
    $updatedAt = $r['updated_at'] ? (new DateTime($r['updated_at']))->format(DATE_ATOM) : null;
    return [
        'id'                 => $r['id'],
        'orderId'            => $r['order_id'],
        'productId'          => $r['product_id'],
        'productName'        => $r['product_name'],
        'reason'             => $r['reason'],
        'note'               => $r['note'],
        'photoUrl'           => $r['photo_url'],
        'status'             => $r['status'],
        'statusHistory'      => decode_json_column($r['status_history']),
        'courierName'        => $r['courier_name'],
        'trackingId'         => $r['tracking_id'],
        'estimatedDelivery'  => $r['estimated_delivery'],
        'createdAt'          => $createdAt,
        'updatedAt'          => $updatedAt,
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        // A single replacement or all of one order's replacements: allow
        // either a signed-in admin, or the signed-in customer who
        // actually owns the underlying order — never anonymous.
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM replacements WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) send_json(null);

            if (!optional_admin($pdo)) {
                $phone = require_customer($pdo);
                $ownerStmt = $pdo->prepare('SELECT customer_phone FROM orders WHERE id = ?');
                $ownerStmt->execute([$row['order_id']]);
                if (($ownerStmt->fetchColumn() ?: null) !== $phone) {
                    send_error('This replacement request does not belong to you.', 403);
                }
            }
            send_json(row_to_replacement($row));
        }

        if (!empty($_GET['orderId'])) {
            if (!optional_admin($pdo)) {
                $phone = require_customer($pdo);
                $ownerStmt = $pdo->prepare('SELECT customer_phone FROM orders WHERE id = ?');
                $ownerStmt->execute([$_GET['orderId']]);
                if (($ownerStmt->fetchColumn() ?: null) !== $phone) {
                    send_error('This order does not belong to you.', 403);
                }
            }
            $stmt = $pdo->prepare('SELECT * FROM replacements WHERE order_id = ? ORDER BY created_at DESC');
            $stmt->execute([$_GET['orderId']]);
            send_json(array_map('row_to_replacement', $stmt->fetchAll()));
        }

        // A signed-in customer's own replacement history (Account page) —
        // scoped by their verified session, never a client-supplied phone.
        if (!empty($_GET['mine'])) {
            $phone = require_customer($pdo);
            $stmt = $pdo->prepare(
                'SELECT r.* FROM replacements r
                 JOIN orders o ON o.id = r.order_id
                 WHERE o.customer_phone = ?
                 ORDER BY r.created_at DESC'
            );
            $stmt->execute([$phone]);
            send_json(array_map('row_to_replacement', $stmt->fetchAll()));
        }

        // Admin view — everything.
        require_admin($pdo);
        $stmt = $pdo->query('SELECT * FROM replacements ORDER BY created_at DESC');
        send_json(array_map('row_to_replacement', $stmt->fetchAll()));
        break;

    case 'POST':
        // Which customer this is comes from their verified session, not
        // a customerPhone field in the body — otherwise anyone could
        // file a replacement request "as" any phone number (the
        // order-ownership check right below this would then be checking
        // against a phone the client just made up).
        $phone = require_customer($pdo);

        $data = request_body();
        $orderId = $data['orderId'] ?? '';

        if (!$orderId || empty($data['productId']) || empty($data['reason'])) {
            send_error('orderId, productId, and reason are required.');
        }

        $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) send_error('Order not found.', 404);

        if ($order['customer_phone'] !== $phone) {
            send_error('This order does not belong to you.', 403);
        }
        if ($order['status'] !== REPLACEMENT_ELIGIBLE_STATUS) {
            send_error(
                "Replacements can only be requested for delivered orders — this order is currently {$order['status']}.",
                409
            );
        }

        $newId = 'RPL' . random_int(100000, 999999); // human-friendly, matches order id style
        $history = [['status' => 'Replacement Requested', 'at' => (new DateTime())->format(DATE_ATOM)]];

        $pdo->prepare(
            'INSERT INTO replacements (id, order_id, product_id, product_name, reason, note, photo_url, status, status_history)
             VALUES (?,?,?,?,?,?,?,?,?)'
        )->execute([
            $newId,
            $orderId,
            $data['productId'],
            $data['productName'] ?? '',
            $data['reason'],
            $data['note'] ?? '',
            $data['photoUrl'] ?? '',
            'Replacement Requested',
            json_encode($history),
        ]);

        $stmt = $pdo->prepare('SELECT * FROM replacements WHERE id = ?');
        $stmt->execute([$newId]);
        send_json(row_to_replacement($stmt->fetch()), 201);
        break;

    case 'PUT':
        require_admin($pdo);
        if (!$id) send_error('Replacement id is required.');
        $data = request_body();

        $stmt = $pdo->prepare('SELECT * FROM replacements WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) send_error('Replacement request not found.', 404);

        $sets = [];
        $values = [];
        if (array_key_exists('status', $data)) {
            $sets[] = 'status = ?';
            $values[] = $data['status'];
            $history = decode_json_column($existing['status_history']);
            $sets[] = 'status_history = ?';
            $values[] = json_encode(append_status_history($history, $data['status']));
        }
        if (array_key_exists('courierName', $data)) {
            $sets[] = 'courier_name = ?';
            $values[] = $data['courierName'];
        }
        if (array_key_exists('trackingId', $data)) {
            $sets[] = 'tracking_id = ?';
            $values[] = $data['trackingId'];
        }
        if (array_key_exists('estimatedDelivery', $data)) {
            $sets[] = 'estimated_delivery = ?';
            $values[] = $data['estimatedDelivery'] ?: null;
        }

        if ($sets) {
            $values[] = $id;
            $pdo->prepare('UPDATE replacements SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);
        }

        $stmt = $pdo->prepare('SELECT * FROM replacements WHERE id = ?');
        $stmt->execute([$id]);
        send_json(row_to_replacement($stmt->fetch()));
        break;

    default:
        send_error('Method not allowed.', 405);
}
