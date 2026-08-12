<?php
/**
 * Admin-only Shiprocket actions for a single order: "rates" (live
 * courier comparison, replaces the old mock quotes), "book" (create/
 * reuse a Shiprocket shipment, assign an AWB, schedule pickup), "track"
 * (live shipment status + Shiprocket's own tracking page URL), and
 * "cancel" (cancel the linked Shiprocket order).
 *
 * This is what backs the "Compare Couriers" / "Book" / "Track Shipment"
 * controls in the admin order page's Shipping Partner card. Mirrors
 * payment_action.php's shape: one file, one `action` field in the body,
 * all four hit the same order lookup + shared helpers from config.php.
 *
 * Nothing here needs its own DB columns — booked-shipment details live
 * inside the existing orders.shipping JSON, merged the same way
 * orders.php's PUT handler already merges a plain tracking-ID edit.
 */
require __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_error('Method not allowed.', 405);
}

require_admin($pdo);

if (!shiprocket_configured()) {
    send_error(
        'Shiprocket is not set up yet. Add SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, and ' .
        'SHIPROCKET_PICKUP_PINCODE in grafiq-api/config.php — see SHIPROCKET_SETUP.md.',
        500
    );
}

$data = request_body();
$orderId = trim($data['orderId'] ?? '');
$action = $data['action'] ?? '';

if (!$orderId) send_error('orderId is required.');

$stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ?');
$stmt->execute([$orderId]);
$order = $stmt->fetch();
if (!$order) send_error('Order not found.', 404);

$address = decode_json_column($order['address']);
$shipping = decode_json_column($order['shipping'], []);
$items = decode_json_column($order['items'], []);

/** COD if this order (or its remaining balance) is collected on delivery. */
function shiprocket_is_cod(array $order): bool
{
    // 'partial' = a partial-COD advance was already paid online, the rest
    // is still due in cash on delivery — still a COD shipment as far as
    // the courier is concerned. Only a fully-paid Razorpay order is
    // Prepaid. (Shiprocket's create-order API has no separate "amount to
    // collect" field distinct from sub_total, so a partial-COD order will
    // show its *full* total as the COD-collectable amount on Shiprocket's
    // side — the advance already collected isn't deducted there. Adjust
    // manually in the Shiprocket dashboard if that matters for your
    // reconciliation.)
    return $order['payment_status'] !== 'paid';
}

switch ($action) {
    // ---------------------------------------------------------------
    // Live courier rate comparison — GET /courier/serviceability/
    // ---------------------------------------------------------------
    case 'rates':
        if (empty($address['pincode'])) {
            send_error("This order has no delivery pincode to check rates against.");
        }

        try {
            [$status, $body] = shiprocket_request($pdo, 'GET', '/courier/serviceability/', null, [
                'pickup_postcode'   => SHIPROCKET_PICKUP_PINCODE,
                'delivery_postcode' => $address['pincode'],
                'weight'            => estimate_weight_kg($order),
                'cod'               => shiprocket_is_cod($order) ? 1 : 0,
                'declared_value'    => (float) $order['total'],
            ]);
        } catch (RuntimeException $e) {
            send_error($e->getMessage(), 502);
        }

        if ($status < 200 || $status >= 300) {
            $message = $body['message'] ?? 'Shiprocket rejected the rate-check request.';
            send_error("Could not fetch live rates: $message", 502);
        }

        $companies = $body['data']['available_courier_companies'] ?? [];
        if (!$companies) {
            send_error(
                'Shiprocket has no serviceable courier for this pincode/weight right now ' .
                '(or the request reached Shiprocket but returned nothing — double-check ' .
                'SHIPROCKET_PICKUP_PINCODE in config.php is a real, registered pickup pincode).',
                502
            );
        }

        $quotes = array_map(function ($c) {
            $etaDays = $c['etd'] ?? $c['estimated_delivery_days'] ?? null;
            return [
                'courierId'   => $c['courier_company_id'],
                'name'        => $c['courier_name'],
                'rate'        => (float) ($c['rate'] ?? $c['freight_charge'] ?? 0),
                'etaDays'     => is_string($etaDays) ? $etaDays : ($etaDays !== null ? "$etaDays days" : '—'),
                'rating'      => (float) ($c['rating'] ?? 0),
                'codAvailable' => (bool) ($c['cod'] ?? true),
            ];
        }, $companies);

        usort($quotes, fn($a, $b) => $a['rate'] <=> $b['rate']);
        send_json(['quotes' => $quotes, 'weight' => estimate_weight_kg($order)]);
        break;

    // ---------------------------------------------------------------
    // Book (or rebook onto a different courier) — creates the Shiprocket
    // order once, then assigns/reassigns an AWB on that same shipment.
    // ---------------------------------------------------------------
    case 'book':
        $courierId = $data['courierId'] ?? null;
        $rate = (float) ($data['rate'] ?? 0);
        $etaDays = $data['etaDays'] ?? null;
        if (!$courierId) send_error('courierId is required.');
        if (empty($address['pincode'])) send_error('This order has no delivery address to ship to.');

        $shipmentId = $shipping['shiprocketShipmentId'] ?? null;

        // Only create the Shiprocket order once per GRAFIQ order — a
        // "Change Courier" rebook re-assigns the AWB on the *same*
        // shipment instead of creating a duplicate order on Shiprocket's
        // side (their order_id has to stay unique per account, and our
        // own order.id is what we use for it).
        if (!$shipmentId) {
            [$firstName, $lastName] = array_pad(explode(' ', trim($address['name'] ?? ''), 2), 2, '');

            $orderItems = array_map(function ($item) {
                return [
                    'name'          => $item['name'] ?? 'Item',
                    'sku'           => $item['productId'] ?? $item['lineId'] ?? 'SKU',
                    'units'         => max(1, (int) ($item['qty'] ?? 1)),
                    'selling_price' => (float) ($item['price'] ?? 0),
                ];
            }, $items ?: [['name' => 'Order ' . $order['id'], 'qty' => 1, 'price' => (float) $order['total']]]);

            $orderDate = !empty($order['created_at'])
                ? (new DateTime($order['created_at']))->format('Y-m-d H:i')
                : (new DateTime())->format('Y-m-d H:i');

            $createBody = [
                'order_id'               => $order['id'],
                'order_date'             => $orderDate,
                'pickup_location'        => SHIPROCKET_PICKUP_LOCATION,
                'billing_customer_name'  => $firstName ?: ($address['name'] ?? 'Customer'),
                'billing_last_name'      => $lastName,
                'billing_address'        => $address['line1'] ?? '',
                'billing_city'           => $address['city'] ?? '',
                'billing_pincode'        => $address['pincode'] ?? '',
                'billing_state'          => $address['state'] ?? '',
                'billing_country'        => 'India',
                'billing_email'          => $order['customer_email'] ?: 'noemail@grafiqstore.example',
                'billing_phone'          => preg_replace('/\D/', '', $order['customer_phone'] ?? ($address['phone'] ?? '')),
                'shipping_is_billing'    => true,
                'order_items'            => $orderItems,
                'payment_method'         => shiprocket_is_cod($order) ? 'COD' : 'Prepaid',
                'sub_total'              => (float) $order['total'],
                'length'                 => SHIPROCKET_DEFAULT_LENGTH,
                'breadth'                => SHIPROCKET_DEFAULT_BREADTH,
                'height'                 => SHIPROCKET_DEFAULT_HEIGHT,
                'weight'                 => estimate_weight_kg($order),
            ];

            try {
                [$status, $body] = shiprocket_request($pdo, 'POST', '/orders/create/adhoc', $createBody);
            } catch (RuntimeException $e) {
                send_error($e->getMessage(), 502);
            }
            if ($status < 200 || $status >= 300 || empty($body['shipment_id'])) {
                $message = $body['message'] ?? (is_array($body['errors'] ?? null) ? json_encode($body['errors']) : 'Shiprocket rejected the order.');
                send_error("Could not create the Shiprocket shipment: $message", 502);
            }
            $shipmentId = $body['shipment_id'];
            $shiprocketOrderId = $body['order_id'] ?? null;
        } else {
            $shiprocketOrderId = $shipping['shiprocketOrderId'] ?? null;
        }

        // Assign (or reassign) the AWB on this shipment to the chosen courier.
        try {
            [$status, $body] = shiprocket_request($pdo, 'POST', '/courier/assign/awb', [
                'shipment_id' => $shipmentId,
                'courier_id'  => $courierId,
            ]);
        } catch (RuntimeException $e) {
            send_error($e->getMessage(), 502);
        }
        // Response nesting for this endpoint isn't perfectly consistent
        // across Shiprocket API versions — check the couple of shapes
        // it's actually been seen in rather than assuming one.
        $awbData = $body['response']['data'] ?? $body['data'] ?? $body;
        $awbCode = $awbData['awb_code'] ?? null;
        $courierName = $awbData['courier_name'] ?? null;
        if ($status < 200 || $status >= 300 || !$awbCode) {
            $message = $body['message'] ?? 'Shiprocket could not assign an AWB for this courier — it may no longer be serviceable for this order, try comparing rates again.';
            send_error($message, 502);
        }

        // Best-effort pickup scheduling — this genuinely can fail for
        // reasons that have nothing to do with the booking itself (e.g.
        // past a courier's daily cutoff time), so it doesn't block the
        // booking from being recorded; it's just noted in the response.
        $pickupScheduled = false;
        try {
            [, $pickupBody] = shiprocket_request($pdo, 'POST', '/courier/generate/pickup', ['shipment_id' => [$shipmentId]]);
            $pickupScheduled = !empty($pickupBody['pickup_status']) || !empty($pickupBody['response']);
        } catch (RuntimeException $e) {
            // Ignored — see comment above.
        }

        $shippingPatch = [
            'courierId'          => $courierId,
            'courierName'        => $courierName ?: 'Courier',
            'cost'               => $rate,
            'etaDays'            => $etaDays,
            'trackingId'         => $awbCode,
            'bookedAt'           => (new DateTime())->format(DATE_ATOM),
            'shiprocketOrderId'  => $shiprocketOrderId,
            'shiprocketShipmentId' => $shipmentId,
            'pickupScheduled'    => $pickupScheduled,
            'cancelled'          => false,
        ];
        $mergedShipping = array_merge($shipping, $shippingPatch);
        $pdo->prepare('UPDATE orders SET shipping = ? WHERE id = ?')->execute([json_encode($mergedShipping), $order['id']]);

        if (in_array($order['status'], ['Pending', 'Confirmed', 'Processing'], true)) {
            $history = append_status_history(decode_json_column($order['status_history']), 'Shipped');
            $pdo->prepare('UPDATE orders SET status = ?, status_history = ? WHERE id = ?')
                ->execute(['Shipped', json_encode($history), $order['id']]);
        }

        send_json(row_to_order(fetch_order_row($pdo, $order['id'])));
        break;

    // ---------------------------------------------------------------
    // Live tracking — GET /courier/track/shipment/{id}, falling back to
    // /courier/track/awb/{awb} for shipments booked before shipmentId
    // started being stored (or if it's ever missing for any reason).
    // ---------------------------------------------------------------
    case 'track':
        $shipmentId = $shipping['shiprocketShipmentId'] ?? null;
        $awb = $shipping['trackingId'] ?? null;
        if (!$shipmentId && !$awb) {
            send_error('No courier has been booked for this order yet.');
        }

        try {
            if ($shipmentId) {
                [$status, $body] = shiprocket_request($pdo, 'GET', "/courier/track/shipment/{$shipmentId}");
            } else {
                [$status, $body] = shiprocket_request($pdo, 'GET', "/courier/track/awb/{$awb}");
            }
        } catch (RuntimeException $e) {
            send_error($e->getMessage(), 502);
        }

        $tracking = $body['tracking_data'] ?? ($body[0]['tracking_data'] ?? null);
        if ($status < 200 || $status >= 300 || !$tracking || (int) ($tracking['track_status'] ?? 0) === 0) {
            $message = $tracking['error'] ?? ($body['message'] ?? 'Shiprocket has no tracking data for this shipment yet — this is normal in the first hour or two after booking.');
            send_error($message, 502);
        }

        $currentStatus = $tracking['shipment_track'][0]['current_status'] ?? null;
        $trackUrl = $tracking['track_url'] ?? null;

        // Best-effort cache of the last known status on the order so it
        // shows up in the Shipping Partner card without another click —
        // never blocks the response if it fails.
        try {
            $mergedShipping = array_merge($shipping, ['lastTrackedStatus' => $currentStatus, 'lastTrackedAt' => (new DateTime())->format(DATE_ATOM)]);
            $pdo->prepare('UPDATE orders SET shipping = ? WHERE id = ?')->execute([json_encode($mergedShipping), $order['id']]);
        } catch (Exception $e) {
            // Ignored.
        }

        send_json(['status' => $currentStatus, 'trackUrl' => $trackUrl]);
        break;

    // ---------------------------------------------------------------
    // Cancel the linked Shiprocket order — POST /orders/cancel
    // ---------------------------------------------------------------
    case 'cancel':
        $shiprocketOrderId = $shipping['shiprocketOrderId'] ?? null;
        if (!$shiprocketOrderId) {
            send_error('This order has no Shiprocket shipment linked to it.');
        }

        try {
            [$status, $body] = shiprocket_request($pdo, 'POST', '/orders/cancel', ['ids' => [$shiprocketOrderId]]);
        } catch (RuntimeException $e) {
            send_error($e->getMessage(), 502);
        }
        if ($status < 200 || $status >= 300) {
            $message = $body['message'] ?? 'Shiprocket rejected the cancellation request.';
            send_error($message, 502);
        }

        $mergedShipping = array_merge($shipping, ['cancelled' => true, 'cancelledAt' => (new DateTime())->format(DATE_ATOM)]);
        $pdo->prepare('UPDATE orders SET shipping = ? WHERE id = ?')->execute([json_encode($mergedShipping), $order['id']]);

        send_json(row_to_order(fetch_order_row($pdo, $order['id'])));
        break;

    default:
        send_error('Unknown action. Use "rates", "book", "track", or "cancel".', 400);
}
