import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { formatPrice } from '../utils/format'
import Button from '../components/ui/Button'

export default function OrderSuccess() {
  const { orderId } = useParams()
  const { orders, settings } = useStore()
  const order = orders.find((o) => o.id === orderId)

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <CheckCircle2 size={64} className="text-volt mx-auto mb-6" />
        <p className="font-display text-3xl md:text-4xl uppercase mb-3">Order Placed!</p>
        <p className="text-slate mb-8">
          Thanks for shopping with {settings.storeName}. We're already prepping your print.
        </p>
        {order && (
          <div className="border border-line p-6 text-left mb-8">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate">Order ID</span>
              <span className="font-accent text-volt">{order.id}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate">Payment Method</span>
              <span className="uppercase">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate">Amount Paid</span>
              <span>{formatPrice(order.total, settings.currencySymbol)}</span>
            </div>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Button as={Link} to="/shop" variant="dark">Continue Shopping</Button>
          <Button as={Link} to="/account" variant="primary">View Orders</Button>
        </div>
      </motion.div>
    </div>
  )
}
