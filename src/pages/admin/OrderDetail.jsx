import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Truck, Star, CheckCircle2, RefreshCw, Save } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { formatPrice, generateTrackingId } from '../../utils/format'
import { getShippingQuotes } from '../../utils/shipping'
import shippingPartners from '../../data/shippingPartners'
import Button from '../../components/ui/Button'
import CircleLoader from '../../components/ui/CircleLoader'

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']

const statusTone = {
  Pending: 'text-slate',
  Confirmed: 'text-volt',
  Processing: 'text-volt',
  Shipped: 'text-volt',
  'Out for Delivery': 'text-volt',
  Delivered: 'text-green-400',
  Cancelled: 'text-red-400'
}

const paymentStatusTone = {
  paid: 'text-volt',
  unpaid: 'text-slate',
  failed: 'text-red-400'
}

export default function OrderDetail() {
  const { id } = useParams()
  const { orders, replacements, settings, loading, updateOrderStatus, updateOrderShipping, updateOrderRefundStatus } = useStore()
  const order = orders.find((o) => o.id === id)
  const linkedReplacements = replacements.filter((r) => r.orderId === id)

  const [trackingInput, setTrackingInput] = useState(order?.shipping?.trackingId || '')
  const [trackingSaved, setTrackingSaved] = useState(false)
  const [showCompare, setShowCompare] = useState(!order?.shipping?.trackingId)
  const [bookingId, setBookingId] = useState(null)
  const [actionError, setActionError] = useState('')

  const quotes = useMemo(
    () => (order ? getShippingQuotes(order, shippingPartners) : []),
    [order]
  )

  if (!order) {
    if (loading) {
      return (
        <div className="flex justify-center py-24">
          <CircleLoader size={56} />
        </div>
      )
    }
    return (
      <div>
        <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-volt mb-6">
          <ArrowLeft size={15} /> Back to Orders
        </Link>
        <p className="font-accent text-xl">Order not found.</p>
      </div>
    )
  }

  const handleSaveTracking = async () => {
    try {
      await updateOrderShipping(order.id, { trackingId: trackingInput.trim() })
      setTrackingSaved(true)
      setTimeout(() => setTrackingSaved(false), 2000)
    } catch (err) {
      setActionError(err.message || 'Could not save the tracking ID.')
    }
  }

  // NOTE: booking is simulated with a short delay and a generated tracking
  // number. Wire this up to a real courier-aggregator API (Shiprocket,
  // Shipway, Delhivery One, etc.) to actually create shipments —
  // `getShippingQuotes` in utils/shipping.js is the one function to swap
  // for a real rate-check call.
  const handleBook = (quote) => {
    setBookingId(quote.partner.id)
    setActionError('')
    setTimeout(async () => {
      try {
        const trackingId = generateTrackingId(quote.partner.id)
        await updateOrderShipping(order.id, {
          courierId: quote.partner.id,
          courierName: quote.partner.name,
          cost: quote.price,
          trackingId,
          bookedAt: new Date().toISOString()
        })
        if (['Pending', 'Confirmed', 'Processing'].includes(order.status)) {
          await updateOrderStatus(order.id, 'Shipped')
        }
        setTrackingInput(trackingId)
        setShowCompare(false)
      } catch (err) {
        setActionError(err.message || 'Could not book this courier.')
      } finally {
        setBookingId(null)
      }
    }, 900)
  }

  return (
    <div>
      <Link to="/admin/orders" className="inline-flex items-center gap-1.5 text-sm text-slate hover:text-volt mb-6">
        <ArrowLeft size={15} /> Back to Orders
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl uppercase">{order.id}</h1>
          <p className="text-slate text-sm mt-1">
            Placed {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'long', year: 'numeric'
            })}
          </p>
        </div>
        <select
          value={order.status}
          onChange={(e) => updateOrderStatus(order.id, e.target.value).catch((err) => setActionError(err.message))}
          className={`bg-panel border border-line px-3 py-2 text-sm font-accent uppercase outline-none ${statusTone[order.status]}`}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s} style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>{s}</option>
          ))}
        </select>
      </div>

      {actionError && <p className="text-red-400 text-sm mb-6">{actionError}</p>}

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Left: customer, items, payment */}
        <div className="flex flex-col gap-8">
          <section className="border border-line p-5">
            <p className="font-accent uppercase tracking-wide text-volt mb-4">Shipping Address</p>
            <p className="font-accent">{order.address?.name}</p>
            <p className="text-slate text-sm mt-1">{order.address?.line1}</p>
            <p className="text-slate text-sm">
              {order.address?.city}, {order.address?.state} — {order.address?.pincode}
            </p>
            <p className="text-slate text-sm mt-1">+91 {order.address?.phone}</p>
          </section>

          <section className="border border-line p-5">
            <p className="font-accent uppercase tracking-wide text-volt mb-4">Items</p>
            <div className="flex flex-col gap-3">
              {order.items?.map((item) => (
                <div key={item.lineId} className="flex gap-3 items-center border-b border-line last:border-0 pb-3 last:pb-0">
                  <img src={item.image} alt={item.name} className="w-14 h-16 object-cover bg-panel shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-accent truncate">{item.name}</p>
                    <p className="text-xs text-slate">
                      {item.size && `Size ${item.size}`} {item.color && `· ${item.color}`} · Qty {item.qty}
                    </p>
                  </div>
                  <span className="text-sm">{formatPrice(item.price * item.qty, settings.currencySymbol)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-line mt-4 pt-4 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-slate">
                <span>Subtotal</span>
                <span>{formatPrice(order.subtotal, settings.currencySymbol)}</span>
              </div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between text-volt">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discountTotal, settings.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate">
                <span>Delivery</span>
                <span>{order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee, settings.currencySymbol)}</span>
              </div>
              <div className="flex justify-between font-accent text-base pt-2 border-t border-line mt-1">
                <span>Total</span>
                <span className="text-volt">{formatPrice(order.total, settings.currencySymbol)}</span>
              </div>
            </div>
          </section>

          <section className="border border-line p-5">
            <p className="font-accent uppercase tracking-wide text-volt mb-2">Payment</p>
            <p className="text-sm text-slate uppercase">{order.paymentMethod}</p>
            <p className={`text-sm font-accent uppercase mt-1 ${paymentStatusTone[order.paymentStatus] || 'text-slate'}`}>
              {order.paymentStatus}
            </p>
          </section>

          {order.status === 'Cancelled' && (
            <section className="border border-red-500/30 bg-red-500/5 p-5">
              <p className="font-accent uppercase tracking-wide text-red-400 mb-2">Cancellation</p>
              {order.cancellationReason && (
                <p className="text-sm text-slate mb-1">Reason: {order.cancellationReason}</p>
              )}
              {order.cancelledAt && (
                <p className="text-xs text-slate mb-3">
                  {new Date(order.cancelledAt).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit'
                  })}
                </p>
              )}
              {order.refundStatus && (
                <div>
                  <label className="text-xs font-accent uppercase text-slate mb-1.5 block">Refund Status</label>
                  <select
                    value={order.refundStatus}
                    onChange={(e) =>
                      updateOrderRefundStatus(order.id, e.target.value).catch((err) => setActionError(err.message))
                    }
                    className="bg-panel border border-line px-3 py-2 text-sm outline-none w-full"
                  >
                    {['pending', 'processing', 'refunded', 'failed'].map((s) => (
                      <option key={s} value={s} style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Right: tracking + shipping partner comparison */}
        <div className="flex flex-col gap-6">
          <section className="border border-line p-5">
            <p className="font-accent uppercase tracking-wide text-volt mb-4">Tracking ID</p>
            <div className="flex gap-2">
              <input
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                placeholder="Paste or type a tracking number"
                className="flex-1 min-w-0 bg-transparent border border-paper/25 focus:border-volt outline-none px-3 py-2 text-sm"
              />
              <button
                onClick={handleSaveTracking}
                className="shrink-0 w-10 h-10 flex items-center justify-center border border-line hover:border-volt"
                aria-label="Save tracking ID"
              >
                <Save size={16} />
              </button>
            </div>
            {trackingSaved && <p className="text-volt text-xs mt-2">Saved ✓</p>}
            <p className="text-xs text-slate mt-2">
              Type this in directly for an offline courier, or book one below to fill it in automatically.
            </p>

            {order.shipping?.courierName && (
              <div className="mt-4 pt-4 border-t border-line flex items-start gap-2">
                <CheckCircle2 size={16} className="text-volt shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p>
                    Booked with <span className="text-volt">{order.shipping.courierName}</span> for{' '}
                    {formatPrice(order.shipping.cost, settings.currencySymbol)}
                  </p>
                  <p className="text-xs text-slate mt-0.5">
                    {new Date(order.shipping.bookedAt).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            )}
          </section>

          {linkedReplacements.length > 0 && (
            <section className="border border-line p-5">
              <p className="font-accent uppercase tracking-wide text-volt mb-4">Replacement Requests</p>
              <div className="flex flex-col gap-3">
                {linkedReplacements.map((r) => (
                  <div key={r.id} className="border border-line p-3 text-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-paper">{r.productName}</p>
                        <p className="text-xs text-slate mt-0.5">{r.reason}</p>
                      </div>
                      <span className="font-accent uppercase text-xs text-volt shrink-0">{r.status}</span>
                    </div>
                    <Link
                      to="/admin/replacements"
                      className="inline-flex items-center gap-1 text-xs font-accent uppercase tracking-wide text-paper hover:text-volt mt-2"
                    >
                      Manage <RefreshCw size={12} />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="border border-line p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-accent uppercase tracking-wide text-volt">Shipping Partners</p>
              <button
                onClick={() => setShowCompare((v) => !v)}
                className="flex items-center gap-1 text-xs text-slate hover:text-volt"
              >
                <RefreshCw size={12} /> {showCompare ? 'Hide' : order.shipping?.courierName ? 'Change Courier' : 'Compare'}
              </button>
            </div>

            {showCompare && (
              <div className="flex flex-col gap-2">
                {quotes.map((q) => (
                  <div
                    key={q.partner.id}
                    className="flex items-center justify-between gap-3 border border-line p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-accent truncate">{q.partner.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate mt-0.5">
                        <span>{q.etaDays}</span>
                        <span className="flex items-center gap-0.5">
                          <Star size={11} className="fill-volt stroke-volt" /> {q.partner.rating}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-accent text-volt">{formatPrice(q.price, settings.currencySymbol)}</span>
                      <Button
                        size="md"
                        variant={order.shipping?.courierId === q.partner.id ? 'dark' : 'primary'}
                        onClick={() => handleBook(q)}
                        disabled={bookingId === q.partner.id}
                        className="px-4 py-2 text-xs"
                      >
                        {bookingId === q.partner.id
                          ? 'Booking…'
                          : order.shipping?.courierId === q.partner.id
                          ? 'Rebook'
                          : 'Book'}
                      </Button>
                    </div>
                  </div>
                ))}
                <p className="text-xs text-slate mt-1 flex items-center gap-1.5">
                  <Truck size={12} /> Estimated parcel weight: {quotes[0]?.weight ?? '—'} kg (based on item count)
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
