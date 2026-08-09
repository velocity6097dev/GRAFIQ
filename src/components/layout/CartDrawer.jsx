import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { X, Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useStore } from '../../context/StoreContext'
import { formatPrice, getDiscountedPrice } from '../../utils/format'
import Button from '../ui/Button'
import LoadingImage from '../ui/LoadingImage'
import useScrollLock from '../../hooks/useScrollLock'

export default function CartDrawer({ open, onClose }) {
  const { items, removeFromCart, updateQty, payable, count } = useCart()
  const { settings } = useStore()
  useScrollLock(open)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 right-0 w-full max-w-md bg-ink border-l border-line z-50 flex flex-col"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-line shrink-0">
              <span className="font-accent text-lg tracking-wide uppercase">
                Your Bag ({count})
              </span>
              <button onClick={onClose} aria-label="Close cart">
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-slate">
                  <p className="font-accent text-lg text-paper">Your bag is empty</p>
                  <p className="text-sm">Nothing added yet — go find something worth wearing.</p>
                  <Button variant="primary" onClick={onClose} as={Link} to="/shop">
                    Browse the Shop
                  </Button>
                </div>
              ) : (
                items.map((item) => {
                  const { finalPrice } = getDiscountedPrice(item.price, item.discount)
                  return (
                    <div key={item.lineId} className="flex gap-4 border-b border-line pb-5">
                      <LoadingImage
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-24 shrink-0"
                        imgClassName="w-full h-full object-cover"
                        loaderSize={24}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <p className="font-accent tracking-wide truncate">{item.name}</p>
                          <button onClick={() => removeFromCart(item.lineId)} aria-label="Remove item">
                            <Trash2 size={16} className="text-slate hover:text-volt" />
                          </button>
                        </div>
                        <p className="text-xs text-slate mt-0.5">
                          {item.size && `Size ${item.size}`}
                          {item.color && ` · ${item.color}`}
                          {item.isCustom && ' · Custom Print'}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border border-paper/25">
                            <button
                              className="p-1.5"
                              onClick={() => updateQty(item.lineId, item.qty - 1)}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-8 text-center text-sm">{item.qty}</span>
                            <button
                              className="p-1.5"
                              onClick={() => updateQty(item.lineId, item.qty + 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="font-accent text-volt">
                            {formatPrice(finalPrice * item.qty, settings.currencySymbol)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {items.length > 0 && (
              <div className="p-5 border-t border-line shrink-0">
                <div className="flex justify-between mb-4 font-accent text-lg">
                  <span>Subtotal</span>
                  <span className="text-volt">{formatPrice(payable, settings.currencySymbol)}</span>
                </div>
                <Button
                  variant="primary"
                  size="lg"
                  as={Link}
                  to="/checkout"
                  onClick={onClose}
                  className="w-full"
                >
                  Checkout
                </Button>
                <Link
                  to="/cart"
                  onClick={onClose}
                  className="block text-center text-sm text-slate hover:text-volt mt-4"
                >
                  View full cart
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
