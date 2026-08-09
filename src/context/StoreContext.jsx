import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import defaultProducts from '../data/products'
import defaultCategories from '../data/categories'
import defaultBanners from '../data/banners'
import defaultSettings from '../data/settings'

const StoreContext = createContext(null)

// All store data now lives in MySQL (see /grafiq-api) instead of
// localStorage. The default*.js imports are only used as an initial
// "skeleton" so the page has something to render for the instant before
// the first fetch resolves — everything is replaced with live database
// data as soon as it arrives, and every write (add/update/delete) goes
// straight to the API.
export function StoreProvider({ children }) {
  const [products, setProducts] = useState(defaultProducts)
  const [categories, setCategories] = useState(defaultCategories)
  const [banners, setBanners] = useState(defaultBanners)
  const [settings, setSettings] = useState(defaultSettings)
  const [orders, setOrders] = useState([])

  const [loading, setLoading] = useState(true)
  // 'connected' | 'error' | 'checking' — surfaced so the UI can warn the
  // person if XAMPP/MySQL isn't reachable instead of failing silently.
  const [dbStatus, setDbStatus] = useState('checking')
  const [dbError, setDbError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      try {
        const [productsRes, categoriesRes, bannersRes, settingsRes, ordersRes] = await Promise.all([
          api.get('/products.php'),
          api.get('/categories.php'),
          api.get('/banners.php'),
          api.get('/settings.php'),
          api.get('/orders.php')
        ])
        if (cancelled) return
        setProducts(productsRes)
        setCategories(categoriesRes)
        setBanners(bannersRes)
        setSettings(settingsRes)
        setOrders(ordersRes)
        setDbStatus('connected')
      } catch (err) {
        if (cancelled) return
        console.warn('Falling back to demo data — could not load from the database:', err)
        setDbStatus('error')
        setDbError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [])

  // ---------- Products ----------
  const addProduct = async (product) => {
    const created = await api.post('/products.php', product)
    setProducts((prev) => [created, ...prev])
    return created
  }

  const updateProduct = async (id, patch) => {
    const updated = await api.put(`/products.php?id=${id}`, patch)
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }

  const deleteProduct = async (id) => {
    await api.del(`/products.php?id=${id}`)
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  // ---------- Categories ----------
  const addCategory = async (category) => {
    const created = await api.post('/categories.php', category)
    setCategories((prev) => [...prev, created])
    return created
  }

  const updateCategory = async (id, patch) => {
    const updated = await api.put(`/categories.php?id=${id}`, patch)
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  const deleteCategory = async (id) => {
    await api.del(`/categories.php?id=${id}`)
    setCategories((prev) => prev.filter((c) => c.id !== id))
    // Mirrors the DB's ON DELETE SET NULL — orphaned products fall back
    // to "uncategorised" rather than disappearing.
    setProducts((prev) => prev.map((p) => (p.categoryId === id ? { ...p, categoryId: null } : p)))
  }

  // ---------- Banners ----------
  const addBanner = async (banner) => {
    const created = await api.post('/banners.php', banner)
    setBanners((prev) => [...prev, created])
    return created
  }

  const updateBanner = async (id, patch) => {
    const updated = await api.put(`/banners.php?id=${id}`, patch)
    setBanners((prev) => prev.map((b) => (b.id === id ? updated : b)))
    return updated
  }

  const deleteBanner = async (id) => {
    await api.del(`/banners.php?id=${id}`)
    setBanners((prev) => prev.filter((b) => b.id !== id))
  }

  const reorderBanner = async (id, direction) => {
    const sorted = [...banners].sort((a, b) => a.order - b.order)
    const idx = sorted.findIndex((b) => b.id === id)
    const swapWith = direction === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapWith]
    const [updatedA, updatedB] = await Promise.all([
      api.put(`/banners.php?id=${a.id}`, { order: b.order }),
      api.put(`/banners.php?id=${b.id}`, { order: a.order })
    ])
    setBanners((prev) =>
      prev.map((banner) => {
        if (banner.id === updatedA.id) return updatedA
        if (banner.id === updatedB.id) return updatedB
        return banner
      })
    )
  }

  // ---------- Settings ----------
  const updateSettings = async (patch) => {
    const updated = await api.put('/settings.php', patch)
    setSettings(updated)
    return updated
  }

  // ---------- Orders ----------
  const addOrder = async (orderData) => {
    const order = await api.post('/orders.php', orderData)
    setOrders((prev) => [order, ...prev])
    return order
  }

  const updateOrderStatus = async (id, status) => {
    const updated = await api.put(`/orders.php?id=${id}`, { status })
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
    return updated
  }

  // Merges shipping/tracking info into an order — used both for the manual
  // "type in a tracking ID" path and for the compare-and-book courier flow.
  const updateOrderShipping = async (id, shippingPatch) => {
    const updated = await api.put(`/orders.php?id=${id}`, { shipping: shippingPatch })
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
    return updated
  }

  const value = useMemo(
    () => ({
      products,
      categories,
      banners: [...banners].sort((a, b) => a.order - b.order),
      settings,
      orders,
      loading,
      dbStatus,
      dbError,
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
    [products, categories, banners, settings, orders, loading, dbStatus, dbError]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
