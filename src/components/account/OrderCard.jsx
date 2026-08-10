import { Truck, Eye, MapPinned, XCircle, RefreshCw } from 'lucide-react'
import { formatPrice } from '../../utils/format'
import { CANCELLABLE_STATUSES, REPLACEMENT_ELIGIBLE_STATUS } from '../../utils/orderTimeline'

const statusTone = {
  Pending: 'text-slate',
  Confirmed: 'text-volt',
  Processing: 'text-volt',
  Shipped: 'text-volt',
  'Out for Delivery': 'text-volt',
  Delivered: 'text-green-400',
  Cancelled: 'text-red-400'
}

function ActionButton({ icon: Icon, label, onClick, tone = 'default' }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-xs font-accent uppercase tracking-wide px-3 py-2 border transition-colors ${
        tone === 'danger'
          ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
          : 'border-line hover:border-volt hover:text-volt'
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  )
}

export default function OrderCard({ order, replacement, onView, onTrack, onCancel, onRequestReplacement }) {
  const canCancel = CANCELLABLE_STATUSES.includes(order.status)
  const canRequestReplacement = order.status === REPLACEMENT_ELIGIBLE_STATUS

  return (
    <div className="border border-line p-5">
      <div className="flex justify-between items-start flex-wrap gap-2">
        <div>
          <p className="font-accent text-volt">{order.id}</p>
          <p className="text-xs text-slate mt-1">
            {new Date(order.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
        <span className={`font-accent uppercase text-sm ${statusTone[order.status] || 'text-slate'}`}>
          {order.status}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        {order.items.slice(0, 2).map((item, i) => (
          <p key={item.lineId || i} className="text-sm text-slate">
            {item.name} × {item.qty} {item.size && `(${item.size})`}
          </p>
        ))}
        {order.items.length > 2 && (
          <p className="text-xs text-slate">+ {order.items.length - 2} more item(s)</p>
        )}
      </div>

      <div className="flex justify-between mt-3 pt-3 border-t border-line text-sm">
        <span className="text-slate">Total</span>
        <span className="font-accent">{formatPrice(order.total)}</span>
      </div>

      {order.shipping?.trackingId && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line text-sm">
          <Truck size={15} className="text-volt shrink-0" />
          <span className="text-slate">
            {order.shipping.courierName ? `${order.shipping.courierName} · ` : ''}
            Tracking ID: <span className="text-paper">{order.shipping.trackingId}</span>
          </span>
        </div>
      )}

      {replacement && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line text-sm">
          <RefreshCw size={15} className="text-volt shrink-0" />
          <span className="text-slate">
            Replacement <span className="text-paper">{replacement.status}</span>
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line">
        <ActionButton icon={Eye} label="View Order" onClick={onView} />
        <ActionButton icon={MapPinned} label="Track Order" onClick={onTrack} />
        {canCancel && <ActionButton icon={XCircle} label="Cancel Order" onClick={onCancel} tone="danger" />}
        {canRequestReplacement && (
          <ActionButton icon={RefreshCw} label="Request Replacement" onClick={onRequestReplacement} />
        )}
      </div>
    </div>
  )
}
