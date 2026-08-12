<?php
require __DIR__ . '/config.php';

function row_to_category(array $r): array
{
    return [
        'id'          => $r['id'],
        'name'        => $r['name'],
        'slug'        => $r['slug'],
        'image'       => $r['image'],
        'description' => $r['description'],
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

// Reads are public (the storefront needs them); writes are admin-only.
if ($method !== 'GET') {
    require_admin($pdo);
}

switch ($method) {
    case 'GET':
        if ($id) {
            $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            send_json($row ? row_to_category($row) : null);
        }
        $stmt = $pdo->query('SELECT * FROM categories ORDER BY created_at ASC');
        send_json(array_map('row_to_category', $stmt->fetchAll()));
        break;

    case 'POST':
        $data = request_body();
        if (empty($data['name'])) send_error('Category name is required.');

        $newId = generate_id('cat');
        $pdo->prepare('INSERT INTO categories (id, name, slug, image, description) VALUES (?,?,?,?,?)')
            ->execute([$newId, $data['name'], slugify($data['name']), $data['image'] ?? '', $data['description'] ?? '']);

        $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
        $stmt->execute([$newId]);
        send_json(row_to_category($stmt->fetch()), 201);
        break;

    case 'PUT':
        if (!$id) send_error('Category id is required.');
        $data = request_body();

        $sets = [];
        $values = [];
        if (array_key_exists('name', $data)) {
            $sets[] = 'name = ?';
            $values[] = $data['name'];
            $sets[] = 'slug = ?';
            $values[] = slugify($data['name']);
        }
        if (array_key_exists('image', $data)) {
            $sets[] = 'image = ?';
            $values[] = $data['image'];
        }
        if (array_key_exists('description', $data)) {
            $sets[] = 'description = ?';
            $values[] = $data['description'];
        }

        if ($sets) {
            $values[] = $id;
            $pdo->prepare('UPDATE categories SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);
        }

        $stmt = $pdo->prepare('SELECT * FROM categories WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) send_error('Category not found.', 404);
        send_json(row_to_category($row));
        break;

    case 'DELETE':
        if (!$id) send_error('Category id is required.');
        // products.category_id has ON DELETE SET NULL, so products in this
        // category become "uncategorised" automatically instead of vanishing.
        $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
        send_json(['success' => true]);
        break;

    default:
        send_error('Method not allowed.', 405);
}
