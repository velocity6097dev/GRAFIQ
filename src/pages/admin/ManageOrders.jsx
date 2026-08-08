import { useState } from 'react'
import { Eye } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { formatPrice } from '../../utils/format'
import Modal from '../../components/ui/Modal'

const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled']

const statusTone = {
  Pending: 'text-slate',
  Processing: 'text-volt',
  Shipped: 'text-volt',
  Delivered: 'text-green-400',
  Cancelled: 'text-red-400'
}

export default function ManageOrders() {
  const { orders, updateOrderStatus, settings } = useStore()
  const [viewOrder, setViewOrder] = useState(null)
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? orders : orders.filter((o) => o.status === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="font-display text-3xl uppercase">Orders</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-panel border border-line px-3 py-2 text-sm font-accent uppercase outline-none"
        >
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate text-sm">No orders match this filter yet.</p>
      ) : (
        <div className="border border-line overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-line text-left text-slate font-accent uppercase text-xs">
                <th className="p-3">Order ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="p-3 font-accent text-volt">{o.id}</td>
                  <td className="p-3">{o.address?.name || '—'}</td>
                  <td className="p-3 text-slate">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="p-3">{o.items?.length || 0}</td>
                  <td className="p-3">{formatPrice(o.total, settings.currencySymbol)}</td>
                  <td className="p-3">
                    <select
                      value={o.status}
                      onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                      className={`bg-transparent border border-line px-2 py-1 text-xs font-accent uppercase outline-none ${statusTone[o.status]}`}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s} className="bg-ink text-paper">{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setViewOrder(o)} aria-label="View order" className="p-1.5 hover:text-volt">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order ${viewOrder?.id || ''}`}>
        {viewOrder && (
          <div className="flex flex-col gap-5 text-sm">
            <div>
              <p className="font-accent uppercase text-volt tracking-wide mb-2">Shipping To</p>
              <p>{viewOrder.address?.name}</p>
              <p className="text-slate">{viewOrder.address?.line1}</p>
              <p className="text-slate">
                {viewOrder.address?.city}, {viewOrder.address?.state} — {viewOrder.address?.pincode}
              </p>
              <p className="text-slate">+91 {viewOrder.address?.phone}</p>
            </div>
            <div>
              <p className="font-accent uppercase text-volt tracking-wide mb-2">Items</p>
              <div className="flex flex-col gap-2">
                {viewOrder.items?.map((item) => (
                  <div key={item.lineId} className="flex justify-between">
                    <span className="text-slate">
                      {item.name} × {item.qty} {item.size && `(${item.size})`}
                    </span>
                    <span>{formatPrice(item.price * item.qty, settings.currencySymbol)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-line pt-4 flex justify-between font-accent text-lg">
              <span>Total</span>
              <span className="text-volt">{formatPrice(viewOrder.total, settings.currencySymbol)}</span>
            </div>
            <p className="text-xs text-slate uppercase">Payment: {viewOrder.paymentMethod}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
