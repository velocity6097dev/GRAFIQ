import { createContext, useContext, useMemo } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'
import { generateId, getDiscountedPrice } from '../utils/format'

const CartContext = createContext(null)

// A cart line looks like:
// { lineId, productId, name, image, price, discount, size, color, qty, isCustom, customDesign }
export function CartProvider({ children }) {
  const [items, setItems] = useLocalStorage('grafiq_cart', [])

  const addToCart = (line) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.productId === line.productId &&
          i.size === line.size &&
          i.color === line.color &&
          !line.isCustom
      )
      if (existing) {
        return prev.map((i) =>
          i.lineId === existing.lineId ? { ...i, qty: i.qty + line.qty } : i
        )
      }
      return [...prev, { ...line, lineId: generateId('line') }]
    })
  }

  const removeFromCart = (lineId) =>
    setItems((prev) => prev.filter((i) => i.lineId !== lineId))

  const updateQty = (lineId, qty) =>
    setItems((prev) =>
      prev.map((i) => (i.lineId === lineId ? { ...i, qty: Math.max(1, qty) } : i))
    )

  const clearCart = () => setItems([])

  const summary = useMemo(() => {
    let subtotal = 0
    let discountTotal = 0
    let count = 0
    items.forEach((i) => {
      const { finalPrice } = getDiscountedPrice(i.price, i.discount)
      subtotal += i.price * i.qty
      discountTotal += (i.price - finalPrice) * i.qty
      count += i.qty
    })
    return { subtotal, discountTotal, count, payable: subtotal - discountTotal }
  }, [items])

  const value = useMemo(
    () => ({ items, addToCart, removeFromCart, updateQty, clearCart, ...summary }),
    [items, summary]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
