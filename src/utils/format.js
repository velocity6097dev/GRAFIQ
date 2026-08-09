// GRAFIQ ships for the India market only, so the currency is hardcoded
// here rather than left editable — an accidental blank/wrong symbol in
// admin settings should never affect what shoppers see. The second
// argument is intentionally ignored (kept so any leftover
// formatPrice(x, settings.currencySymbol) call sites don't need edits).
export function formatPrice(value) {
  const n = Number(value) || 0
  return `₹${n.toLocaleString('en-IN')}`
}

// Returns { finalPrice, hasDiscount } after applying a % discount to a base price.
export function getDiscountedPrice(price, discountPercent = 0) {
  const base = Number(price) || 0
  const pct = Number(discountPercent) || 0
  if (!pct) return { finalPrice: base, hasDiscount: false }
  const finalPrice = Math.round(base - (base * pct) / 100)
  return { finalPrice, hasDiscount: pct > 0 }
}

export function slugify(text = '') {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function generateOrderId() {
  const rand = Math.floor(100000 + Math.random() * 900000)
  return `GRQ${rand}`
}

export function generateTrackingId(partnerId = 'trk') {
  const prefix = partnerId.slice(0, 3).toUpperCase()
  const rand = Math.floor(1000000000 + Math.random() * 9000000000)
  return `${prefix}${rand}`
}
