import { Truck } from 'lucide-react'
import Modal from '../ui/Modal'
import { formatPrice, getDiscountedPrice } from '../../utils/format'

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
  partial: 'text-amber-400',
  unpaid: 'text-slate',
  failed: 'text-red-400'
}

export default function OrderViewModal({ order, open, onClose }) {
  if (!order) return null

  return (
    <Modal open={open} onClose={onClose} title={`Order ${order.id}`} maxWidth="max-w-2xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate">
            Placed {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
          <span className={`font-accent uppercase text-sm ${statusTone[order.status] || 'text-slate'}`}>
            {order.status}
          </span>
        </div>

        {/* Items */}
        <div>
          <p className="font-accent uppercase tracking-wide text-xs text-slate mb-2">Items</p>
          <div className="flex flex-col gap-3">
            {order.items.map((item, i) => (
              <div key={item.lineId || i} className="flex gap-3 border border-line p-3">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-14 h-16 object-cover bg-ink shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.name}</p>
                  <p className="text-xs text-slate mt-0.5">
                    Qty {item.qty}
                    {item.size && ` · Size ${item.size}`}
                    {item.color && ` · ${item.color}`}
                  </p>
                </div>
                <p className="text-sm shrink-0">
                  {formatPrice(getDiscountedPrice(item.price, item.discount).finalPrice * item.qty)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Address */}
        <div>
          <p className="font-accent uppercase tracking-wide text-xs text-slate mb-2">Shipping Address</p>
          <div className="border border-line p-3 text-sm text-slate">
            <p className="text-paper">{order.address?.name}</p>
            <p>{order.address?.line1}</p>
            <p>
              {order.address?.city}, {order.address?.state} — {order.address?.pincode}
            </p>
            {order.address?.phone && <p>+91 {order.address.phone}</p>}
          </div>
        </div>

        {/* Payment + totals */}
        <div>
          <p className="font-accent uppercase tracking-wide text-xs text-slate mb-2">Payment</p>
          <div className="border border-line p-3 text-sm flex flex-col gap-1.5">
            <div className="flex justify-between">
              <span className="text-slate">Method</span>
              <span className="uppercase">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate">Status</span>
              <span className={`uppercase ${paymentStatusTone[order.paymentStatus] || 'text-slate'}`}>
                {order.paymentStatus}
              </span>
            </div>
            {order.refundStatus && (
              <div className="flex justify-between">
                <span className="text-slate">Refund</span>
                <span className="uppercase text-volt">{order.refundStatus}</span>
              </div>
            )}
            <div className="h-px bg-line my-1" />
            <div className="flex justify-between">
              <span className="text-slate">Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-volt">
                <span>Discount</span>
                <span>-{formatPrice(order.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate">Delivery</span>
              <span>{order.deliveryFee === 0 ? 'Free' : formatPrice(order.deliveryFee)}</span>
            </div>
            <div className="flex justify-between font-accent text-base pt-1 border-t border-line mt-1">
              <span>Total</span>
              <span className="text-volt">{formatPrice(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Courier / tracking */}
        {order.shipping?.trackingId && (
          <div>
            <p className="font-accent uppercase tracking-wide text-xs text-slate mb-2">Courier & Tracking</p>
            <div className="border border-line p-3 text-sm flex items-center gap-2">
              <Truck size={16} className="text-volt shrink-0" />
              <span>
                {order.shipping.courierName && `${order.shipping.courierName} · `}
                Tracking ID: <span className="text-paper">{order.shipping.trackingId}</span>
              </span>
            </div>
          </div>
        )}

        {order.status === 'Cancelled' && (
          <div className="border border-red-500/30 bg-red-500/5 p-3 text-sm">
            <p className="text-red-400 font-accent uppercase text-xs mb-1">Order Cancelled</p>
            {order.cancellationReason && <p className="text-slate">Reason: {order.cancellationReason}</p>}
            {order.cancelledAt && (
              <p className="text-slate text-xs mt-1">
                on {new Date(order.cancelledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
