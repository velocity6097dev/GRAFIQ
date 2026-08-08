import { Link } from 'react-router-dom'
import { Package, FolderTree, ClipboardList, IndianRupee, AlertTriangle } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { formatPrice } from '../../utils/format'

export default function Dashboard() {
  const { products, categories, orders, settings } = useStore()

  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
  const lowStock = products.filter((p) => p.stock <= 10)
  const recentOrders = orders.slice(0, 6)

  const stats = [
    { label: 'Total Products', value: products.length, icon: Package },
    { label: 'Categories', value: categories.length, icon: FolderTree },
    { label: 'Total Orders', value: orders.length, icon: ClipboardList },
    { label: 'Revenue', value: formatPrice(revenue, settings.currencySymbol), icon: IndianRupee }
  ]

  return (
    <div>
      <h1 className="font-display text-3xl uppercase mb-8">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="border border-line p-5">
            <Icon size={22} className="text-volt mb-3" />
            <p className="font-display text-2xl">{value}</p>
            <p className="text-xs text-slate uppercase font-accent mt-1">{label}</p>
          </div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="border border-volt/40 bg-volt/5 p-4 mb-10 flex items-start gap-3">
          <AlertTriangle size={18} className="text-volt shrink-0 mt-0.5" />
          <div>
            <p className="font-accent uppercase text-sm tracking-wide text-volt mb-1">Low stock alert</p>
            <p className="text-sm text-slate">
              {lowStock.map((p) => p.name).join(', ')} {lowStock.length === 1 ? 'is' : 'are'} running low
              (10 or fewer left). <Link to="/admin/products" className="text-paper underline">Restock now</Link>.
            </p>
          </div>
        </div>
      )}

      <p className="font-accent uppercase tracking-wide text-volt mb-4">Recent Orders</p>
      {recentOrders.length === 0 ? (
        <p className="text-slate text-sm">No orders yet — they'll show up here as customers check out.</p>
      ) : (
        <div className="border border-line overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-line text-left text-slate font-accent uppercase text-xs">
                <th className="p-3">Order ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="p-3 font-accent text-volt">{o.id}</td>
                  <td className="p-3">{o.address?.name || '—'}</td>
                  <td className="p-3">{o.items?.length || 0}</td>
                  <td className="p-3">{formatPrice(o.total, settings.currencySymbol)}</td>
                  <td className="p-3">{o.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
