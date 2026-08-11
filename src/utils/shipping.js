// getShippingQuotes()/estimateWeightKg()/getZoneMultiplier() below were the
// mock rate model the admin order page used before it was wired up to the
// real Shiprocket API (see grafiq-api/shiprocket_action.php and
// SHIPROCKET_SETUP.md) — OrderDetail.jsx no longer calls getShippingQuotes.
// Left here (a) as a reference/fallback if you ever swap in a different
// courier aggregator and want a quick local sanity-check model again, and
// (b) because getTrackingUrl() below is still actively used, as the
// fallback when Shiprocket's own tracking URL isn't available yet (e.g.
// right after booking, before it has scan data).

export function estimateWeightKg(order) {
  const totalQty = order?.items?.reduce((sum, i) => sum + i.qty, 0) || 1
  return Math.max(0.5, Math.round(totalQty * 0.3 * 10) / 10)
}

export function getZoneMultiplier(pincode = '') {
  const firstDigit = Number(String(pincode).trim()[0])
  const zoneMap = { 1: 1.1, 2: 1.05, 3: 1, 4: 1, 5: 1.1, 6: 1.15, 7: 1.2, 8: 1.25, 9: 1.3, 0: 1.35 }
  return zoneMap[firstDigit] ?? 1.15
}

export function getShippingQuotes(order, partners) {
  const weight = estimateWeightKg(order)
  const zone = getZoneMultiplier(order?.address?.pincode)
  return partners
    .map((partner) => ({
      partner,
      price: Math.round((partner.baseRate + partner.perKgRate * weight) * zone),
      etaDays: partner.etaDays,
      weight
    }))
    .sort((a, b) => a.price - b.price)
}

// Opens a tracking lookup for a booked shipment. Used as a fallback when
// Shiprocket's own track_url isn't available (see handleTrackShipment in
// OrderDetail.jsx) — rather than guess at a specific carrier's deep-link
// URL format and risk a broken page, this points at a prefilled search
// that reliably lands on the right tracking page in one click.
export function getTrackingUrl(courierName, trackingId) {
  const query = encodeURIComponent(`${courierName || 'courier'} tracking ${trackingId}`)
  return `https://www.google.com/search?q=${query}`
}
