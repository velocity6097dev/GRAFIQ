import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useStore } from '../context/StoreContext'
import { formatPrice, getDiscountedPrice } from '../utils/format'
import Button from '../components/ui/Button'

export default function Cart() {
  const { items, removeFromCart, updateQty, subtotal, discountTotal, payable } = useCart()
  const { settings } = useStore()

  const deliveryFee = payable >= settings.freeDeliveryAbove || payable === 0 ? 0 : settings.deliveryFee

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="font-display text-3xl uppercase mb-3">Your bag is empty</p>
        <p className="text-slate mb-8">Nothing added yet — go find something worth wearing.</p>
        <Button as={Link} to="/shop" variant="primary">Browse the Shop</Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      <h1 className="font-display text-3xl md:text-4xl uppercase mb-8">Your Bag</h1>
      <div className="grid lg:grid-cols-[1fr_340px] gap-10">
        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const { finalPrice } = getDiscountedPrice(item.price, item.discount)
            return (
              <div key={item.lineId} className="flex gap-4 border border-line p-4">
                <img src={item.image} alt={item.name} className="w-24 h-28 object-cover bg-panel shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <div>
                      <p className="font-accent tracking-wide text-lg">{item.name}</p>
                      <p className="text-xs text-slate mt-0.5">
                        {item.size && `Size ${item.size}`}
                        {item.color && ` · ${item.color}`}
                        {item.isCustom && ' · Custom Print'}
                      </p>
                    </div>
                    <button onClick={() => removeFromCart(item.lineId)} aria-label="Remove item">
                      <Trash2 size={18} className="text-slate hover:text-volt" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-paper/25">
                      <button className="p-2" onClick={() => updateQty(item.lineId, item.qty - 1)} aria-label="Decrease">
                        <Minus size={14} />
                      </button>
                      <span className="w-10 text-center">{item.qty}</span>
                      <button className="p-2" onClick={() => updateQty(item.lineId, item.qty + 1)} aria-label="Increase">
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="font-accent text-lg text-volt">
                      {formatPrice(finalPrice * item.qty, settings.currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="border border-line p-6 h-fit sticky top-24">
          <p className="font-accent uppercase tracking-wide text-lg mb-5">Order Summary</p>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate">Subtotal</span>
            <span>{formatPrice(subtotal, settings.currencySymbol)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex justify-between text-sm mb-2 text-volt">
              <span>Discount</span>
              <span>-{formatPrice(discountTotal, settings.currencySymbol)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate">Delivery</span>
            <span>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee, settings.currencySymbol)}</span>
          </div>
          <div className="border-t border-line mt-4 pt-4 flex justify-between font-accent text-xl">
            <span>Total</span>
            <span className="text-volt">{formatPrice(payable + deliveryFee, settings.currencySymbol)}</span>
          </div>
          <Button as={Link} to="/checkout" variant="primary" className="w-full mt-6">
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  )
}
