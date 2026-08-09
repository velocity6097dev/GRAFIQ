<?php
require __DIR__ . '/config.php';

function row_to_product(array $r): array
{
    return [
        'id'          => $r['id'],
        'name'        => $r['name'],
        'categoryId'  => $r['category_id'],
        'price'       => (float) $r['price'],
        'discount'    => (int) $r['discount'],
        'images'      => decode_json_column($r['images']),
        'colors'      => decode_json_column($r['colors']),
        'sizes'       => decode_json_column($r['sizes']),
        'stock'       => (int) $r['stock'],
        'rating'      => (float) $r['rating'],
        'reviews'     => (int) $r['reviews'],
        'tags'        => decode_json_column($r['tags']),
        'description' => $r['description'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            send_json($row ? row_to_product($row) : null);
        }
        $stmt = $pdo->query('SELECT * FROM products ORDER BY created_at DESC');
        send_json(array_map('row_to_product', $stmt->fetchAll()));
        break;

    case 'POST':
        $data = request_body();
        if (empty($data['name'])) send_error('Product name is required.');

        $newId = generate_id('p');
        $stmt = $pdo->prepare(
            'INSERT INTO products (id, name, category_id, price, discount, images, colors, sizes, stock, rating, reviews, tags, description)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $newId,
            $data['name'],
            $data['categoryId'] ?: null,
            $data['price'] ?? 0,
            $data['discount'] ?? 0,
            json_encode($data['images'] ?? []),
            json_encode($data['colors'] ?? []),
            json_encode($data['sizes'] ?? []),
            $data['stock'] ?? 0,
            $data['rating'] ?? 4.5,
            $data['reviews'] ?? 0,
            json_encode($data['tags'] ?? []),
            $data['description'] ?? '',
        ]);

        $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
        $stmt->execute([$newId]);
        send_json(row_to_product($stmt->fetch()), 201);
        break;

    case 'PUT':
        if (!$id) send_error('Product id is required.');
        $data = request_body();

        $columnMap = [
            'name' => 'name', 'price' => 'price', 'discount' => 'discount',
            'stock' => 'stock', 'rating' => 'rating', 'reviews' => 'reviews',
            'description' => 'description',
        ];
        $sets = [];
        $values = [];
        foreach ($columnMap as $key => $column) {
            if (array_key_exists($key, $data)) {
                $sets[] = "$column = ?";
                $values[] = $data[$key];
            }
        }
        if (array_key_exists('categoryId', $data)) {
            $sets[] = 'category_id = ?';
            $values[] = $data['categoryId'] ?: null;
        }
        foreach (['images', 'colors', 'sizes', 'tags'] as $key) {
            if (array_key_exists($key, $data)) {
                $sets[] = "$key = ?";
                $values[] = json_encode($data[$key]);
            }
        }

        if ($sets) {
            $values[] = $id;
            $pdo->prepare('UPDATE products SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);
        }

        $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) send_error('Product not found.', 404);
        send_json(row_to_product($row));
        break;

    case 'DELETE':
        if (!$id) send_error('Product id is required.');
        $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
        send_json(['success' => true]);
        break;

    default:
        send_error('Method not allowed.', 405);
}
