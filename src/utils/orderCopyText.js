import { formatPrice } from './format'
import { formatTimelineDate } from './orderTimeline'

export function formatAddressForCopy(order) {
  const a = order.address || {}
  return [
    `Name: ${a.name || '—'}`,
    `Phone: +91 ${a.phone || '—'}`,
    `Address: ${a.line1 || '—'}`,
    `${a.city || '—'}, ${a.state || '—'} - ${a.pincode || '—'}`
  ].join('\n')
}

export function formatCustomerForCopy(order) {
  return [
    `Customer ID: ${order.customerId || '—'}`,
    `Name: ${order.address?.name || '—'}`,
    `Phone: +91 ${order.customerPhone || order.address?.phone || '—'}`,
    `Email: ${order.customerEmail || '—'}`
  ].join('\n')
}

export function formatItemsForCopy(order, currencySymbol) {
  const lines = (order.items || []).map((item) => {
    const variant = [item.size && `Size ${item.size}`, item.color].filter(Boolean).join(', ')
    return `${item.name}${variant ? ` (${variant})` : ''} × ${item.qty} — ${formatPrice(item.price * item.qty, currencySymbol)}`
  })
  return [
    ...lines,
    '',
    `Subtotal: ${formatPrice(order.subtotal, currencySymbol)}`,
    order.discountTotal > 0 ? `Discount: -${formatPrice(order.discountTotal, currencySymbol)}` : null,
    `Delivery: ${order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee, currencySymbol)}`,
    `Total: ${formatPrice(order.total, currencySymbol)}`
  ]
    .filter((line) => line !== null)
    .join('\n')
}

// Deliberately limited to method / status / amount — no Razorpay Order
// ID, Payment ID, Refund ID, or any other Razorpay identifier. Those
// stay visible on-screen for admin reference but are excluded from this
// panel's COPY ALL by design (see the Payment section's UI).
export function formatPaymentForCopy(order, currencySymbol) {
  return [
    `Payment Method: ${order.paymentMethod || '—'}`,
    `Payment Status: ${order.paymentStatus || '—'}`,
    `Amount: ${formatPrice(order.total, currencySymbol)}`
  ].join('\n')
}

export function formatTrackingForCopy(order) {
  return [
    `Tracking ID: ${order.shipping?.trackingId || 'Not assigned yet'}`,
    order.shipping?.courierName ? `Courier: ${order.shipping.courierName}` : null,
    order.shipping?.bookedAt ? `Booked: ${new Date(order.shipping.bookedAt).toLocaleString('en-IN')}` : null
  ]
    .filter((line) => line !== null)
    .join('\n')
}

export function formatShippingPartnerForCopy(order, currencySymbol, shippingStatusLabel) {
  if (!order.shipping?.courierName) return 'No courier booked yet.'
  return [
    `Courier: ${order.shipping.courierName}`,
    `Tracking Number: ${order.shipping.trackingId || '—'}`,
    `Shipping Status: ${shippingStatusLabel || '—'}`,
    `Shipping Cost: ${formatPrice(order.shipping.cost, currencySymbol)}`,
    `Booked: ${order.shipping.bookedAt ? new Date(order.shipping.bookedAt).toLocaleString('en-IN') : '—'}`
  ].join('\n')
}

export function formatActivityForCopy(activitySteps) {
  return activitySteps
    .map((step) => `${step.done ? '✓' : '○'} ${step.label}${step.at ? ` — ${formatTimelineDate(step.at)}` : ''}`)
    .join('\n')
}
