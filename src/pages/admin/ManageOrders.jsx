import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ArrowRight, Truck, RefreshCw } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { formatPrice } from '../../utils/format'
import Button from '../../components/ui/Button'

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

const paymentTone = {
  paid: 'text-volt',
  partial: 'text-amber-400',
  unpaid: 'text-slate',
  failed: 'text-red-400'
}

export default function ManageOrders() {
  const { orders, settings, runPaymentQueue } = useStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [queueRunning, setQueueRunning] = useState(false)
  const [queueResult, setQueueResult] = useState(null)

  const pendingCount = orders.filter((o) => o.paymentMethod === 'Razorpay' && o.paymentStatus === 'unpaid').length

  const handleRunQueue = async () => {
    setQueueRunning(true)
    setQueueResult(null)
    try {
      const result = await runPaymentQueue()
      setQueueResult(result)
    } catch (err) {
      setQueueResult({ error: err.message })
    } finally {
      setQueueRunning(false)
    }
  }

  const filtered = useMemo(() => {
    let list = filter === 'all' ? orders : orders.filter((o) => o.status === filter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.address?.name?.toLowerCase().includes(q) ||
          o.address?.phone?.includes(q) ||
          o.shipping?.trackingId?.toLowerCase().includes(q)
      )
    }
    return list
  }, [orders, filter, search])

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase">Orders</h1>
          <p className="text-slate text-sm mt-1">{orders.length} total orders</p>
        </div>
        <div className="text-right">
          <Button variant="dark" onClick={handleRunQueue} disabled={queueRunning}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={14} className={queueRunning ? 'animate-spin' : ''} />
              {queueRunning ? 'Verifying…' : 'Verify Pending Payments'}
            </span>
          </Button>
          {pendingCount > 0 && !queueResult && (
            <p className="text-xs text-slate mt-2">{pendingCount} Razorpay order(s) awaiting confirmation.</p>
          )}
          {queueResult && !queueResult.error && (
            <p className="text-xs text-slate mt-2">
              Checked {queueResult.processed}, verified {queueResult.verified}, failed {queueResult.failed}
              {queueResult.retried > 0 && `, retrying ${queueResult.retried}`}.
            </p>
          )}
          {queueResult?.error && <p className="text-xs text-red-400 mt-2">{queueResult.error}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 border border-paper/25 px-3 py-2 flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="text-slate shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer, phone, or tracking ID..."
            className="bg-transparent outline-none flex-1 text-sm min-w-0"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-panel border border-line px-3 py-2 text-sm font-accent uppercase outline-none"
        >
          <option value="all" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate text-sm">No orders match this search/filter.</p>
      ) : (
        <div className="border border-line overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-line text-left text-slate font-accent uppercase text-xs">
                <th className="p-3">Order ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Status</th>
                <th className="p-3">Tracking</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="p-3 font-accent text-volt">{o.id}</td>
                  <td className="p-3">
                    <p>{o.address?.name || '—'}</p>
                    <p className="text-xs text-slate">{o.address?.phone && `+91 ${o.address.phone}`}</p>
                  </td>
                  <td className="p-3 text-slate">
                    {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="p-3">{o.items?.length || 0}</td>
                  <td className="p-3">{formatPrice(o.total, settings.currencySymbol)}</td>
                  <td className="p-3">
                    <p className="text-xs">{o.paymentMethod}</p>
                    <p className={`text-xs font-accent uppercase ${paymentTone[o.paymentStatus] || 'text-slate'}`}>
                      {o.paymentStatus}
                    </p>
                  </td>
                  <td className={`p-3 font-accent uppercase text-xs ${statusTone[o.status] || 'text-slate'}`}>
                    {o.status}
                  </td>
                  <td className="p-3">
                    {o.shipping?.trackingId ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <Truck size={13} className="text-volt shrink-0" />
                        <span className="truncate">{o.shipping.trackingId}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate">Not booked</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="inline-flex items-center gap-1 text-xs font-accent uppercase tracking-wide text-paper hover:text-volt"
                    >
                      View <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
