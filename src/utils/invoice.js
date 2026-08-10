import { formatPrice, getDiscountedPrice } from './format'

// No PDF library in this project, so "Download/Print Invoice" is done the
// lightweight way: build a self-contained, print-styled HTML document and
// open it in a new tab, then trigger the browser's print dialog. Every
// modern browser's print dialog offers "Save as PDF" as a destination, so
// this covers both "print it" and "download it" without adding a
// dependency or a backend PDF-generation step.
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function openInvoice(order, settings) {
  if (!order) return

  const currency = settings?.currencySymbol
  const itemRows = (order.items || [])
    .map((item) => {
      const { finalPrice } = getDiscountedPrice(item.price, item.discount)
      const lineTotal = finalPrice * item.qty
      const variant = [item.size && `Size ${item.size}`, item.color].filter(Boolean).join(' · ')
      return `
        <tr>
          <td>
            <div class="item-name">${escapeHtml(item.name)}</div>
            ${variant ? `<div class="item-variant">${escapeHtml(variant)}</div>` : ''}
          </td>
          <td class="num">${item.qty}</td>
          <td class="num">${escapeHtml(formatPrice(finalPrice, currency))}</td>
          <td class="num">${escapeHtml(formatPrice(lineTotal, currency))}</td>
        </tr>`
    })
    .join('')

  const advanceRows =
    order.advancePaid && order.advanceAmount > 0
      ? `
        <div class="totals-row">
          <span>Advance Paid (online, non-refundable)</span>
          <span>${escapeHtml(formatPrice(order.advanceAmount, currency))}</span>
        </div>
        <div class="totals-row">
          <span>Due on Delivery</span>
          <span>${escapeHtml(formatPrice(order.total - order.advanceAmount, currency))}</span>
        </div>`
      : ''

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice ${escapeHtml(order.id)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .store-name { font-size: 24px; font-weight: 800; letter-spacing: 0.05em; }
  .invoice-title { text-align: right; }
  .invoice-title h1 { margin: 0; font-size: 20px; letter-spacing: 0.05em; }
  .invoice-title p { margin: 4px 0 0; color: #666; font-size: 13px; }
  .meta { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
  .meta-block { flex: 1; }
  .meta-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin: 0 0 6px; }
  .meta-block p { margin: 0 0 2px; font-size: 13.5px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #888; border-bottom: 2px solid #111; padding: 8px 6px; }
  td { padding: 10px 6px; border-bottom: 1px solid #e5e5e5; font-size: 13.5px; vertical-align: top; }
  .item-name { font-weight: 600; }
  .item-variant { color: #888; font-size: 12px; margin-top: 2px; }
  .num { text-align: right; white-space: nowrap; }
  .totals { margin-left: auto; width: 280px; }
  .totals-row { display: flex; justify-content: space-between; font-size: 13.5px; padding: 4px 0; }
  .totals-row.grand { border-top: 2px solid #111; margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: 800; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #888; }
  @media print {
    body { padding: 0; }
    @page { margin: 18mm; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="store-name">${escapeHtml(settings?.storeName || 'GRAFIQ')}</div>
    <div class="invoice-title">
      <h1>INVOICE</h1>
      <p>${escapeHtml(order.id)}</p>
      <p>${formatDate(order.createdAt)}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <h3>Billed To</h3>
      <p>${escapeHtml(order.address?.name)}</p>
      <p>${escapeHtml(order.address?.line1)}</p>
      <p>${escapeHtml(order.address?.city)}, ${escapeHtml(order.address?.state)} — ${escapeHtml(order.address?.pincode)}</p>
      ${order.address?.phone ? `<p>+91 ${escapeHtml(order.address.phone)}</p>` : ''}
      ${order.customerEmail ? `<p>${escapeHtml(order.customerEmail)}</p>` : ''}
    </div>
    <div class="meta-block">
      <h3>Payment</h3>
      <p>Method: ${escapeHtml(order.paymentMethod)}</p>
      <p>Status: ${escapeHtml(order.paymentStatus)}</p>
      ${order.payment?.razorpayPaymentId ? `<p>Razorpay Payment ID: ${escapeHtml(order.payment.razorpayPaymentId)}</p>` : ''}
      ${order.shipping?.trackingId ? `<p>Tracking ID: ${escapeHtml(order.shipping.trackingId)}</p>` : ''}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="num">Qty</th>
        <th class="num">Price</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row"><span>Subtotal</span><span>${escapeHtml(formatPrice(order.subtotal, currency))}</span></div>
    ${order.discountTotal > 0 ? `<div class="totals-row"><span>Discount</span><span>-${escapeHtml(formatPrice(order.discountTotal, currency))}</span></div>` : ''}
    <div class="totals-row"><span>Delivery</span><span>${order.deliveryFee === 0 ? 'Free' : escapeHtml(formatPrice(order.deliveryFee, currency))}</span></div>
    <div class="totals-row grand"><span>Total</span><span>${escapeHtml(formatPrice(order.total, currency))}</span></div>
    ${advanceRows}
  </div>

  <div class="footer">
    <p>${escapeHtml(settings?.storeName || 'GRAFIQ')} · ${escapeHtml(settings?.contactEmail || '')} ${settings?.contactPhone ? `· ${escapeHtml(settings.contactPhone)}` : ''}</p>
  </div>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return // popup blocked — nothing more we can do without a user gesture retry
  win.document.open()
  win.document.write(html)
  win.document.close()
}
