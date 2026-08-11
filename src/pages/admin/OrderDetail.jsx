import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Truck,
  Star,
  CheckCircle2,
  Circle,
  RefreshCw,
  Save,
  User,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  RotateCcw,
  FileText,
  ExternalLink
} from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { api } from '../../api/client'
import { formatPrice } from '../../utils/format'
import { getTrackingUrl } from '../../utils/shipping'
import { buildAdminActivity, formatTimelineDate } from '../../utils/orderTimeline'
import { openInvoice } from '../../utils/invoice'
import {
  formatAddressForCopy,
  formatCustomerForCopy,
  formatItemsForCopy,
  formatPaymentForCopy,
  formatTrackingForCopy,
  formatShippingPartnerForCopy,
  formatActivityForCopy
} from '../../utils/orderCopyText'
import Button from '../../components/ui/Button'
import CircleLoader from '../../components/ui/CircleLoader'
import Modal from '../../components/ui/Modal'
import CopyButton from '../../components/ui/CopyButton'
import Toast from '../../components/ui/Toast'

const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled']

const statusTone = {
  Pending: 'text-slate',
  Booked: 'text-volt',
  Confirmed: 'text-volt',
  Processing: 'text-volt',
  Shipped: 'text-volt',
  'Out for Delivery': 'text-volt',
  Delivered: 'text-green-400',
  Cancelled: 'text-red-400'
}

const paymentStatusTone = {
  paid: 'text-volt',
  partial: 'text-amber-400',
  unpaid: 'text-slate',
  failed: 'text-red-400'
}

// Trust/Risk states for the Customer Security panel. #39FF14 is a
// specific brand green requested for GOOD — outside the theme's usual
// `volt` accent — so it's applied as an arbitrary Tailwind value rather
// than added as a new named color just for this one badge.
const trustTone = {
  GOOD: { label: 'GOOD', color: 'text-[#39FF14]', Icon: ShieldCheck },
  MEDIUM_RISK: { label: 'MEDIUM RISK', color: 'text-yellow-400', Icon: ShieldAlert },
  RISKY: { label: 'RISKY', color: 'text-red-400', Icon: ShieldX }
}

function TrustRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate">{label}</span>
      <span className="font-accent">{value}</span>
    </div>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const {
    orders,
    replacements,
    settings,
    loading,
    updateOrderStatus,
    updateOrderShipping,
    updateOrderRefundStatus,
    updateOrderNotes,
    verifyOrderPayment,
    refundOrderPayment,
    getShiprocketRates,
    bookShiprocketCourier,
    cancelShiprocketShipment,
    trackShiprocketShipment
  } = useStore()
  const order = orders.find((o) => o.id === id)
  const linkedReplacements = replacements.filter((r) => r.orderId === id)

  const [trackingInput, setTrackingInput] = useState(order?.shipping?.trackingId || '')
  const [trackingSaved, setTrackingSaved] = useState(false)
  const [showCompare, setShowCompare] = useState(!order?.shipping?.trackingId)
  const [bookingId, setBookingId] = useState(null)
  const [actionError, setActionError] = useState('')

  // Live Shiprocket rate comparison — fetched on demand (opening the
  // Compare Couriers panel) rather than eagerly on every order load,
  // since unlike the old mock quotes this is a real paid-per-call API.
  const [quotes, setQuotes] = useState([])
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [quotesError, setQuotesError] = useState('')
  const [quotesFetchedFor, setQuotesFetchedFor] = useState(null)
  const [estimatedWeight, setEstimatedWeight] = useState(null)
  const [tracking, setTracking] = useState(null)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [cancellingShipment, setCancellingShipment] = useState(false)

  const [notesInput, setNotesInput] = useState(order?.adminNotes || '')
  const [notesSaved, setNotesSaved] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  const [verifying, setVerifying] = useState(false)
  const [showRefundForm, setShowRefundForm] = useState(false)
  const [refundAmount, setRefundAmount] = useState('')
  const [refunding, setRefunding] = useState(false)

  const [trust, setTrust] = useState(null)
  const [trustLoading, setTrustLoading] = useState(false)
  const [trustError, setTrustError] = useState('')
  const [showTrustModal, setShowTrustModal] = useState(false)

  const [toastMessage, setToastMessage] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimeoutRef = useRef(null)

  const showToast = (message = 'Copied to clipboard!') => {
    setToastMessage(message)
    setToastVisible(true)
    clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToastVisible(false), 2000)
  }

  const activity = useMemo(() => buildAdminActivity(order), [order])

  // Fetches live courier rates from Shiprocket the first time the
  // Compare Couriers panel opens for this order (and again if the admin
  // hits Refresh Rates). Cached per order id in quotesFetchedFor so
  // toggling the panel open/closed doesn't re-hit the API every time.
  const loadQuotes = async () => {
    if (!order) return
    setQuotesLoading(true)
    setQuotesError('')
    try {
      const { quotes: live, weight } = await getShiprocketRates(order.id)
      setQuotes(live)
      setEstimatedWeight(weight)
      setQuotesFetchedFor(order.id)
    } catch (err) {
      setQuotesError(err.message || 'Could not fetch live courier rates.')
    } finally {
      setQuotesLoading(false)
    }
  }

  useEffect(() => {
    if (showCompare && order && quotesFetchedFor !== order.id) {
      loadQuotes()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCompare, order?.id])

  // Customer Security panel's Trust/Risk data — fetched per customer
  // phone from customer_trust.php (computed live from their order +
  // replacement history, see that file for the scoring heuristic).
  useEffect(() => {
    const phone = order?.customerPhone || order?.address?.phone
    if (!phone) return
    let cancelled = false
    setTrustLoading(true)
    setTrustError('')
    api
      .get(`/customer_trust.php?phone=${encodeURIComponent(phone)}`)
      .then((data) => {
        if (!cancelled) setTrust(data)
      })
      .catch((err) => {
        if (!cancelled) setTrustError(err.message || 'Could not load this customer\'s trust profile.')
      })
      .finally(() => {
        if (!cancelled) setTrustLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [order?.customerPhone, order?.address?.phone])

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

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    setActionError('')
    try {
      await updateOrderNotes(order.id, notesInput.trim())
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    } catch (err) {
      setActionError(err.message || 'Could not save the admin notes.')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleVerifyPayment = async () => {
    setVerifying(true)
    setActionError('')
    try {
      await verifyOrderPayment(order.id)
    } catch (err) {
      setActionError(err.message || 'Could not verify this payment right now.')
    } finally {
      setVerifying(false)
    }
  }

  const openRefundForm = () => {
    setRefundAmount(order.payment?.amount ? String(order.payment.amount) : '')
    setShowRefundForm(true)
    setActionError('')
  }

  const handleRefund = async () => {
    const amount = Number(refundAmount)
    if (!amount || amount <= 0) {
      setActionError('Enter a refund amount greater than 0.')
      return
    }
    setRefunding(true)
    setActionError('')
    try {
      await refundOrderPayment(order.id, amount)
      setShowRefundForm(false)
    } catch (err) {
      setActionError(err.message || 'Could not process this refund.')
    } finally {
      setRefunding(false)
    }
  }

  // Fetches Shiprocket's live shipment status + its own tracking-page
  // URL and opens that URL — falling back to the generic Google-search
  // lookup (getTrackingUrl) only if Shiprocket can't return one (e.g.
  // right after booking, before it has scan data yet).
  const handleTrackShipment = async () => {
    if (!order.shipping?.trackingId) return
    setTrackingLoading(true)
    setActionError('')
    try {
      const result = await trackShiprocketShipment(order.id)
      setTracking(result)
      const url = result.trackUrl || getTrackingUrl(order.shipping.courierName, order.shipping.trackingId)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setActionError(err.message || 'Could not fetch live tracking right now.')
      // Still let the admin get *somewhere* useful even if Shiprocket's
      // tracking call failed for some reason.
      window.open(getTrackingUrl(order.shipping.courierName, order.shipping.trackingId), '_blank', 'noopener,noreferrer')
    } finally {
      setTrackingLoading(false)
    }
  }

  const handlePrintInvoice = () => openInvoice(order, settings)

  // Books (or, if this order already has a Shiprocket shipment, reassigns
  // the AWB on that same shipment — a "Change Courier" rebook) a real
  // Shiprocket shipment for the chosen quote. See
  // grafiq-api/shiprocket_action.php for what actually happens with it.
  const handleBook = async (quote) => {
    setBookingId(quote.courierId)
    setActionError('')
    try {
      const updated = await bookShiprocketCourier(order.id, {
        courierId: quote.courierId,
        rate: quote.rate,
        etaDays: quote.etaDays
      })
      setTrackingInput(updated.shipping?.trackingId || '')
      setShowCompare(false)
    } catch (err) {
      setActionError(err.message || 'Could not book this courier.')
    } finally {
      setBookingId(null)
    }
  }

  const handleCancelShipment = async () => {
    setCancellingShipment(true)
    setActionError('')
    try {
      await cancelShiprocketShipment(order.id)
    } catch (err) {
      setActionError(err.message || 'Could not cancel this shipment.')
    } finally {
      setCancellingShipment(false)
    }
  }

  // "Shipping Status" for the Shipping Partner card — order.status once a
  // courier is booked, or "Booked" if it's booked but hasn't moved to
  // Shipped/etc. yet.
  const shippingStatusLabel = order.shipping?.courierName
    ? ['Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'].includes(order.status)
      ? order.status
      : 'Booked'
    : null

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
        <div className="flex items-center gap-3">
          <Button size="md" variant="outline" onClick={handlePrintInvoice} className="px-4 py-2 text-xs">
            <FileText size={13} /> Print / Download Invoice
          </Button>
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
      </div>

      {actionError && <p className="text-red-400 text-sm mb-6">{actionError}</p>}

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Left: address, customer, items, payment, notes */}
        <div className="flex flex-col gap-8">
          <section className="border border-line p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-accent uppercase tracking-wide text-volt">Shipping Address</p>
              <CopyButton getText={() => formatAddressForCopy(order)} onCopied={showToast} />
            </div>
            <p className="font-accent">{order.address?.name}</p>
            <p className="text-slate text-sm mt-1">{order.address?.line1}</p>
            <p className="text-slate text-sm">
              {order.address?.city}, {order.address?.state} — {order.address?.pincode}
            </p>
            <p className="text-slate text-sm mt-1">+91 {order.address?.phone}</p>
          </section>

          <div className="grid sm:grid-cols-2 gap-8">
            <section className="border border-line p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="font-accent uppercase tracking-wide text-volt flex items-center gap-2">
                  <User size={14} /> Customer
                </p>
                <CopyButton getText={() => formatCustomerForCopy(order)} onCopied={showToast} />
              </div>
              <p className="font-accent">{order.address?.name || '—'}</p>
              <p className="text-slate text-sm mt-1">+91 {order.customerPhone || order.address?.phone || '—'}</p>
              <p className="text-slate text-sm mt-1">{order.customerEmail || 'No email provided'}</p>
            </section>

            <section className="border border-line p-5">
              <p className="font-accent uppercase tracking-wide text-volt mb-4">Customer Security</p>

              {trustLoading ? (
                <p className="text-xs text-slate">Loading trust profile…</p>
              ) : trustError ? (
                <p className="text-xs text-red-400">{trustError}</p>
              ) : trust ? (
                (() => {
                  const { label, color, Icon } = trustTone[trust.trustLevel] || trustTone.MEDIUM_RISK
                  return (
                    <button
                      onClick={() => setShowTrustModal(true)}
                      className="flex items-center gap-2 group"
                      aria-label="View customer trust details"
                    >
                      <Icon size={20} className={`${color} shrink-0`} />
                      <span className={`font-accent uppercase text-sm tracking-wide ${color} group-hover:underline`}>
                        {label}
                      </span>
                    </button>
                  )
                })()
              ) : (
                <p className="text-xs text-slate">—</p>
              )}

              <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t border-line">
                <div className="min-w-0">
                  <p className="text-xs text-slate uppercase font-accent mb-1">IP Address</p>
                  <p className="text-sm font-mono truncate">{order.customerIp || 'Not recorded'}</p>
                </div>
                {order.customerIp && (
                  <CopyButton
                    iconOnly
                    label="Copy IP Address"
                    getText={() => order.customerIp}
                    onCopied={showToast}
                  />
                )}
              </div>
            </section>
          </div>

          <section className="border border-line p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-accent uppercase tracking-wide text-volt">Items</p>
              <CopyButton getText={() => formatItemsForCopy(order, settings.currencySymbol)} onCopied={showToast} />
            </div>
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
            <div className="flex items-center justify-between mb-4">
              <p className="font-accent uppercase tracking-wide text-volt">Payment</p>
              <div className="flex items-center gap-3">
                <CopyButton getText={() => formatPaymentForCopy(order, settings.currencySymbol)} onCopied={showToast} />
                {order.payment?.razorpayPaymentId && (
                  <button
                    onClick={handleVerifyPayment}
                    disabled={verifying}
                    className="flex items-center gap-1 text-xs text-slate hover:text-volt disabled:opacity-50"
                  >
                    <ShieldCheck size={12} /> {verifying ? 'Verifying…' : 'Verify Payment'}
                  </button>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <p className="text-xs text-slate uppercase font-accent mb-1">Method</p>
                <p>{order.paymentMethod || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate uppercase font-accent mb-1">Status</p>
                <p className={`font-accent uppercase ${paymentStatusTone[order.paymentStatus] || 'text-slate'}`}>
                  {order.paymentStatus}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate uppercase font-accent mb-1">Order Total</p>
                <p>{formatPrice(order.total, settings.currencySymbol)}</p>
              </div>
              {order.advancePaid && order.advanceAmount > 0 && (
                <>
                  <div>
                    <p className="text-xs text-slate uppercase font-accent mb-1">Advance Paid (non-refundable)</p>
                    <p className="text-amber-400">{formatPrice(order.advanceAmount, settings.currencySymbol)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate uppercase font-accent mb-1">Due on Delivery</p>
                    <p>{formatPrice(order.total - order.advanceAmount, settings.currencySymbol)}</p>
                  </div>
                </>
              )}
            </div>

            {order.payment ? (
              <div className="mt-4 pt-4 border-t border-line grid sm:grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs text-slate uppercase font-accent mb-1">Razorpay Order ID</p>
                  <p className="text-xs font-mono break-all">{order.payment.razorpayOrderId || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate uppercase font-accent mb-1">Razorpay Payment ID</p>
                  <p className="text-xs font-mono break-all">{order.payment.razorpayPaymentId || '—'}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate mt-4 pt-4 border-t border-line">
                No online payment linked to this order{order.paymentMethod === 'COD' ? ' — plain Cash on Delivery.' : '.'}
              </p>
            )}

            {order.payment?.razorpayPaymentId && (
              <div className="mt-4 pt-4 border-t border-line">
                {!showRefundForm ? (
                  <Button size="md" variant="outline" onClick={openRefundForm} className="px-4 py-2 text-xs">
                    <RotateCcw size={13} /> Refund
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-slate uppercase font-accent">
                      Refund Amount ({settings.currencySymbol})
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="number"
                        value={refundAmount}
                        onChange={(e) => setRefundAmount(e.target.value)}
                        className="flex-1 min-w-[8rem] bg-transparent border border-paper/25 focus:border-volt outline-none px-3 py-2 text-sm"
                      />
                      <Button
                        size="md"
                        variant="primary"
                        onClick={handleRefund}
                        disabled={refunding}
                        className="px-4 py-2 text-xs"
                      >
                        {refunding ? 'Processing…' : 'Confirm Refund'}
                      </Button>
                      <Button
                        size="md"
                        variant="ghost"
                        onClick={() => setShowRefundForm(false)}
                        className="px-3 py-2 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-slate">
                      Defaults to the full {formatPrice(order.payment.amount, settings.currencySymbol)} that was paid.
                      Lower it to deduct shipping charges etc. before refunding the rest.
                    </p>
                  </div>
                )}
                {order.refundStatus && (
                  <p className="text-xs text-slate mt-3">
                    Refund status: <span className="text-paper">{order.refundStatus}</span>
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="border border-line p-5">
            <p className="font-accent uppercase tracking-wide text-volt mb-4">Admin Notes</p>
            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              placeholder="Internal notes — call summaries, special instructions, etc. Not visible to the customer."
              rows={3}
              className="w-full bg-transparent border border-paper/25 focus:border-volt outline-none px-3 py-2 text-sm resize-y"
            />
            <div className="flex items-center gap-3 mt-2">
              <Button size="md" variant="outline" onClick={handleSaveNotes} disabled={savingNotes} className="px-4 py-2 text-xs">
                <Save size={13} /> {savingNotes ? 'Saving…' : 'Save Notes'}
              </Button>
              {notesSaved && <p className="text-volt text-xs">Saved ✓</p>}
            </div>
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

        {/* Right: activity, tracking, replacements, shipping partner */}
        <div className="flex flex-col gap-6">
          <section className="border border-line p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-accent uppercase tracking-wide text-volt">Order Activity</p>
              <CopyButton getText={() => formatActivityForCopy(activity)} onCopied={showToast} />
            </div>
            <div className="flex flex-col">
              {activity.map((step, i) => (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {step.done ? (
                      <CheckCircle2 size={16} className="text-volt shrink-0" />
                    ) : (
                      <Circle size={16} className="text-slate shrink-0" />
                    )}
                    {i < activity.length - 1 && (
                      <div className={`w-px flex-1 my-1 ${step.done ? 'bg-volt/40' : 'bg-line'}`} style={{ minHeight: '1.25rem' }} />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className={`text-sm font-accent uppercase ${step.done ? 'text-paper' : 'text-slate'}`}>{step.label}</p>
                    {step.at && <p className="text-xs text-slate mt-0.5">{formatTimelineDate(step.at)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-line p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-accent uppercase tracking-wide text-volt">Tracking ID</p>
              <CopyButton getText={() => formatTrackingForCopy(order)} onCopied={showToast} />
            </div>
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
              <p className="font-accent uppercase tracking-wide text-volt">Shipping Partner</p>
              <div className="flex items-center gap-3">
                <CopyButton
                  getText={() => formatShippingPartnerForCopy(order, settings.currencySymbol, shippingStatusLabel)}
                  onCopied={showToast}
                />
                {order.shipping?.courierName && !order.shipping?.cancelled && (
                  <button
                    onClick={() => setShowCompare((v) => !v)}
                    className="flex items-center gap-1 text-xs text-slate hover:text-volt"
                  >
                    <RefreshCw size={12} /> {showCompare ? 'Hide' : 'Change Courier'}
                  </button>
                )}
              </div>
            </div>

            {order.shipping?.courierName ? (
              <div className="grid sm:grid-cols-2 gap-x-4 gap-y-3 text-sm mb-4">
                <div>
                  <p className="text-xs text-slate uppercase font-accent mb-1">Courier</p>
                  <p>{order.shipping.courierName}</p>
                </div>
                <div>
                  <p className="text-xs text-slate uppercase font-accent mb-1">AWB / Tracking Number</p>
                  <p className="font-mono text-xs">{order.shipping.trackingId || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate uppercase font-accent mb-1">Shipping Status</p>
                  <p className={`font-accent uppercase text-xs ${order.shipping?.cancelled ? 'text-red-400' : statusTone[shippingStatusLabel] || 'text-volt'}`}>
                    {order.shipping?.cancelled ? 'Cancelled' : shippingStatusLabel}
                  </p>
                  {tracking?.status && (
                    <p className="text-xs text-slate mt-0.5">Latest scan: {tracking.status}</p>
                  )}
                  {!tracking?.status && order.shipping?.lastTrackedStatus && (
                    <p className="text-xs text-slate mt-0.5">Latest scan: {order.shipping.lastTrackedStatus}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate uppercase font-accent mb-1">Booked</p>
                  <p className="text-xs text-slate">
                    {order.shipping.bookedAt ? new Date(order.shipping.bookedAt).toLocaleString('en-IN') : '—'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate mb-4">No courier booked yet — compare live rates below and book one.</p>
            )}

            <div className="flex gap-2 mb-4 flex-wrap">
              {order.shipping?.trackingId && (
                <Button size="md" variant="outline" onClick={handleTrackShipment} disabled={trackingLoading} className="px-4 py-2 text-xs">
                  <ExternalLink size={13} /> {trackingLoading ? 'Tracking…' : 'Track Shipment'}
                </Button>
              )}
              {order.shipping?.courierName && !order.shipping?.cancelled && (
                <Button
                  size="md"
                  variant="outline"
                  onClick={handleCancelShipment}
                  disabled={cancellingShipment}
                  className="px-4 py-2 text-xs border-red-400/50 text-red-400 hover:border-red-400"
                >
                  {cancellingShipment ? 'Cancelling…' : 'Cancel Shipment'}
                </Button>
              )}
              {!order.shipping?.courierName && (
                <button
                  onClick={() => setShowCompare((v) => !v)}
                  className="flex items-center gap-1 text-xs text-slate hover:text-volt"
                >
                  <RefreshCw size={12} /> {showCompare ? 'Hide' : 'Compare Couriers'}
                </button>
              )}
            </div>

            {showCompare && (
              <div className="flex flex-col gap-2">
                {quotesLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate py-3">
                    <CircleLoader size={16} /> Fetching live rates from Shiprocket…
                  </div>
                )}

                {!quotesLoading && quotesError && (
                  <div className="border border-red-400/40 p-3 text-xs text-red-400">
                    <p>{quotesError}</p>
                    <button onClick={loadQuotes} className="mt-2 flex items-center gap-1 text-paper hover:text-volt">
                      <RefreshCw size={11} /> Try again
                    </button>
                  </div>
                )}

                {!quotesLoading && !quotesError && quotes.map((q) => (
                  <div
                    key={q.courierId}
                    className="flex items-center justify-between gap-3 border border-line p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-accent truncate">{q.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate mt-0.5">
                        <span>{q.etaDays}</span>
                        {q.rating > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Star size={11} className="fill-volt stroke-volt" /> {q.rating}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-accent text-volt">{formatPrice(q.rate, settings.currencySymbol)}</span>
                      <Button
                        size="md"
                        variant={order.shipping?.courierId === q.courierId ? 'dark' : 'primary'}
                        onClick={() => handleBook(q)}
                        disabled={bookingId === q.courierId}
                        className="px-4 py-2 text-xs"
                      >
                        {bookingId === q.courierId
                          ? 'Booking…'
                          : order.shipping?.courierId === q.courierId
                          ? 'Rebook'
                          : 'Book'}
                      </Button>
                    </div>
                  </div>
                ))}
                {!quotesLoading && !quotesError && (
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-slate flex items-center gap-1.5">
                      <Truck size={12} /> Estimated parcel weight: {estimatedWeight ?? '—'} kg (based on item count)
                    </p>
                    <button onClick={loadQuotes} className="flex items-center gap-1 text-xs text-slate hover:text-volt">
                      <RefreshCw size={11} /> Refresh Rates
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <Modal
        open={showTrustModal}
        onClose={() => setShowTrustModal(false)}
        title="Customer Trust Details"
        maxWidth="max-w-sm"
      >
        {trust && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-3 border-b border-line">
              {(() => {
                const { label, color, Icon } = trustTone[trust.trustLevel] || trustTone.MEDIUM_RISK
                return (
                  <>
                    <Icon size={22} className={color} />
                    <span className={`font-accent uppercase tracking-wide ${color}`}>{label}</span>
                  </>
                )
              })()}
            </div>
            <TrustRow label="Total Orders" value={trust.totalOrders} />
            <TrustRow label="Cancelled Orders" value={trust.cancelledOrders} />
            <TrustRow label="Returned Orders" value={trust.returnedOrders} />
            <TrustRow label="Replacement Requests" value={trust.replacementRequests} />
            <TrustRow label="Failed Orders" value={trust.failedOrders} />
            <TrustRow label="Trust Score" value={`${trust.trustScore} / 100`} />
            <TrustRow label="Last Updated" value={trust.lastUpdated ? formatTimelineDate(trust.lastUpdated) : '—'} />
          </div>
        )}
      </Modal>

      <Toast message={toastMessage} visible={toastVisible} />
    </div>
  )
}
