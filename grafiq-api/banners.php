<?php
require __DIR__ . '/config.php';

function row_to_banner(array $r): array
{
    return [
        'id'              => $r['id'],
        'eyebrow'         => $r['eyebrow'],
        'titleLine1'      => $r['title_line1'],
        'titleHighlight1' => $r['title_highlight1'],
        'titleLine2'      => $r['title_line2'],
        'titleHighlight2' => $r['title_highlight2'],
        'subtitle'        => $r['subtitle'],
        'image'           => $r['image'],
        'ctaPrimary'      => decode_json_column($r['cta_primary'], null),
        'ctaSecondary'    => decode_json_column($r['cta_secondary'], null),
        'active'          => (bool) $r['active'],
        'order'           => (int) $r['sort_order'],
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
            $stmt = $pdo->prepare('SELECT * FROM banners WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            send_json($row ? row_to_banner($row) : null);
        }
        $stmt = $pdo->query('SELECT * FROM banners ORDER BY sort_order ASC');
        send_json(array_map('row_to_banner', $stmt->fetchAll()));
        break;

    case 'POST':
        $data = request_body();
        $newId = generate_id('b');
        $nextOrder = (int) $pdo->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM banners')->fetchColumn();

        $pdo->prepare(
            'INSERT INTO banners (id, eyebrow, title_line1, title_highlight1, title_line2, title_highlight2, subtitle, image, cta_primary, cta_secondary, active, sort_order)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $newId,
            $data['eyebrow'] ?? '',
            $data['titleLine1'] ?? '',
            $data['titleHighlight1'] ?? '',
            $data['titleLine2'] ?? '',
            $data['titleHighlight2'] ?? '',
            $data['subtitle'] ?? '',
            $data['image'] ?? '',
            isset($data['ctaPrimary']) ? json_encode($data['ctaPrimary']) : null,
            isset($data['ctaSecondary']) ? json_encode($data['ctaSecondary']) : null,
            1,
            $nextOrder,
        ]);

        $stmt = $pdo->prepare('SELECT * FROM banners WHERE id = ?');
        $stmt->execute([$newId]);
        send_json(row_to_banner($stmt->fetch()), 201);
        break;

    case 'PUT':
        if (!$id) send_error('Banner id is required.');
        $data = request_body();

        $columnMap = [
            'eyebrow' => 'eyebrow', 'titleLine1' => 'title_line1', 'titleHighlight1' => 'title_highlight1',
            'titleLine2' => 'title_line2', 'titleHighlight2' => 'title_highlight2', 'subtitle' => 'subtitle',
            'image' => 'image',
        ];
        $sets = [];
        $values = [];
        foreach ($columnMap as $key => $column) {
            if (array_key_exists($key, $data)) {
                $sets[] = "$column = ?";
                $values[] = $data[$key];
            }
        }
        foreach (['ctaPrimary' => 'cta_primary', 'ctaSecondary' => 'cta_secondary'] as $key => $column) {
            if (array_key_exists($key, $data)) {
                $sets[] = "$column = ?";
                $values[] = $data[$key] === null ? null : json_encode($data[$key]);
            }
        }
        if (array_key_exists('active', $data)) {
            $sets[] = 'active = ?';
            $values[] = $data['active'] ? 1 : 0;
        }
        if (array_key_exists('order', $data)) {
            $sets[] = 'sort_order = ?';
            $values[] = (int) $data['order'];
        }

        if ($sets) {
            $values[] = $id;
            $pdo->prepare('UPDATE banners SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);
        }

        $stmt = $pdo->prepare('SELECT * FROM banners WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) send_error('Banner not found.', 404);
        send_json(row_to_banner($row));
        break;

    case 'DELETE':
        if (!$id) send_error('Banner id is required.');
        $pdo->prepare('DELETE FROM banners WHERE id = ?')->execute([$id]);
        send_json(['success' => true]);
        break;

    default:
        send_error('Method not allowed.', 405);
}
