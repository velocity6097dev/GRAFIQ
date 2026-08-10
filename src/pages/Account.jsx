import { useMemo, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import Button from '../components/ui/Button'
import Pagination from '../components/ui/Pagination'
import OrderCard from '../components/account/OrderCard'
import OrderViewModal from '../components/account/OrderViewModal'
import TrackOrderModal from '../components/account/TrackOrderModal'
import CancelOrderModal from '../components/account/CancelOrderModal'
import RequestReplacementModal from '../components/account/RequestReplacementModal'

const PAGE_SIZE = 10

export default function Account() {
  const { user, logout } = useAuth()
  const { orders, replacements } = useStore()
  const [page, setPage] = useState(1)

  const [viewOrder, setViewOrder] = useState(null)
  const [trackOrder, setTrackOrder] = useState(null)
  const [cancelOrderTarget, setCancelOrderTarget] = useState(null)
  const [replacementOrder, setReplacementOrder] = useState(null)

  const myOrders = useMemo(
    () =>
      user
        ? orders
            .filter((o) => o.customerPhone === user.phone)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [],
    [orders, user]
  )

  // Most recent replacement per order, for the card's quick status line
  // and so Track Order can show both timelines together.
  const replacementByOrderId = useMemo(() => {
    const map = new Map()
    for (const r of replacements) {
      const existing = map.get(r.orderId)
      if (!existing || new Date(r.createdAt) > new Date(existing.createdAt)) {
        map.set(r.orderId, r)
      }
    }
    return map
  }, [replacements])

  if (!user) return <Navigate to="/login" replace />

  const totalPages = Math.max(1, Math.ceil(myOrders.length / PAGE_SIZE))
  const pageOrders = myOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const goToPage = (p) => {
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase">My Account</h1>
          <p className="text-slate text-sm mt-1">+91 {user.phone}</p>
        </div>
        <Button variant="dark" onClick={logout}>Log Out</Button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <p className="font-accent uppercase tracking-wide text-volt">Order History</p>
        {myOrders.length > 0 && (
          <p className="text-xs text-slate">
            {myOrders.length} order{myOrders.length !== 1 && 's'}
          </p>
        )}
      </div>

      {myOrders.length === 0 ? (
        <div className="border border-line p-10 text-center">
          <p className="text-slate mb-4">You haven't placed any orders yet.</p>
          <Button as={Link} to="/shop" variant="primary">Start Shopping</Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {pageOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                replacement={replacementByOrderId.get(order.id)}
                onView={() => setViewOrder(order)}
                onTrack={() => setTrackOrder(order)}
                onCancel={() => setCancelOrderTarget(order)}
                onRequestReplacement={() => setReplacementOrder(order)}
              />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
        </>
      )}

      <OrderViewModal order={viewOrder} open={!!viewOrder} onClose={() => setViewOrder(null)} />
      <TrackOrderModal
        order={trackOrder}
        replacement={trackOrder ? replacementByOrderId.get(trackOrder.id) : null}
        open={!!trackOrder}
        onClose={() => setTrackOrder(null)}
      />
      <CancelOrderModal
        order={cancelOrderTarget}
        open={!!cancelOrderTarget}
        onClose={() => setCancelOrderTarget(null)}
      />
      <RequestReplacementModal
        order={replacementOrder}
        open={!!replacementOrder}
        onClose={() => setReplacementOrder(null)}
      />
    </div>
  )
}
