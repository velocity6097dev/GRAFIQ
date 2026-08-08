import { createContext, useContext, useMemo } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'
import defaultProducts from '../data/products'
import defaultCategories from '../data/categories'
import defaultBanners from '../data/banners'
import defaultSettings from '../data/settings'
import { generateId, generateOrderId, slugify } from '../utils/format'

const StoreContext = createContext(null)

export function StoreProvider({ children }) {
  const [products, setProducts] = useLocalStorage('grafiq_products', defaultProducts)
  const [categories, setCategories] = useLocalStorage('grafiq_categories', defaultCategories)
  const [banners, setBanners] = useLocalStorage('grafiq_banners', defaultBanners)
  const [settings, setSettings] = useLocalStorage('grafiq_settings', defaultSettings)
  const [orders, setOrders] = useLocalStorage('grafiq_orders', [])

  // ---------- Products ----------
  const addProduct = (product) =>
    setProducts((prev) => [...prev, { ...product, id: generateId('p') }])

  const updateProduct = (id, patch) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const deleteProduct = (id) =>
    setProducts((prev) => prev.filter((p) => p.id !== id))

  // ---------- Categories ----------
  const addCategory = (category) =>
    setCategories((prev) => [
      ...prev,
      { ...category, id: generateId('cat'), slug: slugify(category.name) }
    ])

  const updateCategory = (id, patch) =>
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...patch, slug: patch.name ? slugify(patch.name) : c.slug }
          : c
      )
    )

  const deleteCategory = (id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
    // orphaned products fall back to "uncategorised" rather than disappearing
    setProducts((prev) =>
      prev.map((p) => (p.categoryId === id ? { ...p, categoryId: null } : p))
    )
  }

  // ---------- Banners ----------
  const addBanner = (banner) =>
    setBanners((prev) => [
      ...prev,
      { ...banner, id: generateId('b'), order: prev.length + 1, active: true }
    ])

  const updateBanner = (id, patch) =>
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)))

  const deleteBanner = (id) =>
    setBanners((prev) => prev.filter((b) => b.id !== id))

  const reorderBanner = (id, direction) =>
    setBanners((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order)
      const idx = sorted.findIndex((b) => b.id === id)
      const swapWith = direction === 'up' ? idx - 1 : idx + 1
      if (swapWith < 0 || swapWith >= sorted.length) return prev
      const tmp = sorted[idx].order
      sorted[idx].order = sorted[swapWith].order
      sorted[swapWith].order = tmp
      return sorted
    })

  // ---------- Settings ----------
  const updateSettings = (patch) => setSettings((prev) => ({ ...prev, ...patch }))

  // ---------- Orders ----------
  const addOrder = (orderData) => {
    const order = {
      id: generateOrderId(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      ...orderData
    }
    setOrders((prev) => [order, ...prev])
    return order
  }

  const updateOrderStatus = (id, status) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)))

  // Merges shipping/tracking info into an order — used both for the manual
  // "type in a tracking ID" path and for the compare-and-book courier flow.
  const updateOrderShipping = (id, shippingPatch) =>
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, shipping: { ...(o.shipping || {}), ...shippingPatch } } : o
      )
    )

  const value = useMemo(
    () => ({
      products,
      categories,
      banners: [...banners].sort((a, b) => a.order - b.order),
      settings,
      orders,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      addBanner,
      updateBanner,
      deleteBanner,
      reorderBanner,
      updateSettings,
      addOrder,
      updateOrderStatus,
      updateOrderShipping
    }),
    [products, categories, banners, settings, orders]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
