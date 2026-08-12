<?php
require __DIR__ . '/config.php';

function row_to_settings(array $r): array
{
    return [
        'storeName'         => $r['store_name'],
        'tagline'           => $r['tagline'],
        'tickerText'        => $r['ticker_text'],
        'currencySymbol'    => $r['currency_symbol'],
        'deliveryFee'       => (float) $r['delivery_fee'],
        'freeDeliveryAbove' => (float) $r['free_delivery_above'],
        'contactEmail'      => $r['contact_email'],
        'contactPhone'      => $r['contact_phone'],
        'instagram'         => $r['instagram'],
        'facebook'          => $r['facebook'],
        'twitter'           => $r['twitter'],
        'features'          => decode_json_column($r['features']),
        // Partial-COD: % of the order total a customer must pay upfront
        // (online, via Razorpay) to confirm a Cash-on-Delivery order
        // before it ships. 0 = COD works as a normal, fully-pay-on-
        // delivery order — the historical/default behaviour.
        'codAdvancePercent' => (float) ($r['cod_advance_percent'] ?? 0),
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

// Reads are public (the storefront needs them); writes are admin-only.
if ($method !== 'GET') {
    require_admin($pdo);
}

switch ($method) {
    case 'GET':
        $stmt = $pdo->query('SELECT * FROM settings WHERE id = 1');
        $row = $stmt->fetch();
        if (!$row) send_error('Settings row missing — did you import schema.sql?', 500);
        send_json(row_to_settings($row));
        break;

    case 'PUT':
        $data = request_body();

        $columnMap = [
            'storeName' => 'store_name', 'tagline' => 'tagline', 'tickerText' => 'ticker_text',
            'currencySymbol' => 'currency_symbol', 'deliveryFee' => 'delivery_fee',
            'freeDeliveryAbove' => 'free_delivery_above', 'contactEmail' => 'contact_email',
            'contactPhone' => 'contact_phone', 'instagram' => 'instagram',
            'facebook' => 'facebook', 'twitter' => 'twitter',
            'codAdvancePercent' => 'cod_advance_percent',
        ];
        $sets = [];
        $values = [];
        foreach ($columnMap as $key => $column) {
            if (array_key_exists($key, $data)) {
                $value = $data[$key];
                if ($key === 'codAdvancePercent') {
                    // Clamp to a sane 0–100% range regardless of what the
                    // client sends.
                    $value = max(0, min(100, (float) $value));
                }
                $sets[] = "$column = ?";
                $values[] = $value;
            }
        }
        if (array_key_exists('features', $data)) {
            $sets[] = 'features = ?';
            $values[] = json_encode($data['features']);
        }

        if ($sets) {
            $pdo->prepare('UPDATE settings SET ' . implode(', ', $sets) . ' WHERE id = 1')->execute($values);
        }

        $stmt = $pdo->query('SELECT * FROM settings WHERE id = 1');
        send_json(row_to_settings($stmt->fetch()));
        break;

    default:
        send_error('Method not allowed.', 405);
}
