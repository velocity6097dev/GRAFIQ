import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { formatPrice } from '../utils/format'
import Button from '../components/ui/Button'

const statusTone = {
  Pending: 'text-slate',
  Processing: 'text-volt',
  Shipped: 'text-volt',
  Delivered: 'text-green-400',
  Cancelled: 'text-red-400'
}

export default function Account() {
  const { user, logout } = useAuth()
  const { orders, settings } = useStore()

  if (!user) return <Navigate to="/login" replace />

  const myOrders = orders.filter((o) => o.customerPhone === user.phone)

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase">My Account</h1>
          <p className="text-slate text-sm mt-1">+91 {user.phone}</p>
        </div>
        <Button variant="dark" onClick={logout}>Log Out</Button>
      </div>

      <p className="font-accent uppercase tracking-wide text-volt mb-4">Order History</p>
      {myOrders.length === 0 ? (
        <div className="border border-line p-10 text-center">
          <p className="text-slate mb-4">You haven't placed any orders yet.</p>
          <Button as={Link} to="/shop" variant="primary">Start Shopping</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {myOrders.map((order) => (
            <div key={order.id} className="border border-line p-5">
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
                {order.items.map((item) => (
                  <p key={item.lineId} className="text-sm text-slate">
                    {item.name} × {item.qty} {item.size && `(${item.size})`}
                  </p>
                ))}
              </div>
              <div className="flex justify-between mt-3 pt-3 border-t border-line text-sm">
                <span className="text-slate">Total</span>
                <span className="font-accent">{formatPrice(order.total, settings.currencySymbol)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
