// Rough mock pricing model: estimate a parcel's weight from item count,
// apply a destination "zone" multiplier derived from the pincode, and
// price every partner off the same inputs so the quotes are genuinely
// comparable. Replace with a real courier-aggregator rate-check API for
// production use — this only exists so the admin can compare something
// without wiring up real shipping accounts first.

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

// Opens a tracking lookup for a booked shipment. There's no real courier
// API wired up yet (see the note above), so rather than guess at a
// specific carrier's deep-link URL format (and risk sending the admin to
// a broken page), this points at a prefilled search that reliably lands
// on the right tracking page in one click. Swap this for real deep
// links per-carrier once a courier-aggregator API is integrated.
export function getTrackingUrl(courierName, trackingId) {
  const query = encodeURIComponent(`${courierName || 'courier'} tracking ${trackingId}`)
  return `https://www.google.com/search?q=${query}`
}
