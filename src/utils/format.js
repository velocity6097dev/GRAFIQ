export function formatPrice(value, symbol = '₹') {
  const n = Number(value) || 0
  return `${symbol}${n.toLocaleString('en-IN')}`
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
