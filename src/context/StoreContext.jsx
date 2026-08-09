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
    const controller = new AbortController()

    // React 18 StrictMode runs this effect twice in development (mount →
    // cleanup → mount again) purely to help catch bugs — without an
    // AbortController, the first mount's 5 requests keep running in the
    // background even after being "cancelled" locally, doubling up load
    // on Apache/MySQL right at startup. Actually aborting them, plus a
    // couple of quick retries for the normal cold-start hiccup (first
    // request after XAMPP just started), is what fixes the "shows
    // disconnected until I refresh" symptom instead of just hiding it.
    async function loadOnce() {
      const [productsRes, categoriesRes, bannersRes, settingsRes, ordersRes] = await Promise.all([
        api.get('/products.php', { signal: controller.signal }),
        api.get('/categories.php', { signal: controller.signal }),
        api.get('/banners.php', { signal: controller.signal }),
        api.get('/settings.php', { signal: controller.signal }),
        api.get('/orders.php', { signal: controller.signal })
      ])
      return { productsRes, categoriesRes, bannersRes, settingsRes, ordersRes }
    }

    async function loadAll() {
      const MAX_ATTEMPTS = 3
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const { productsRes, categoriesRes, bannersRes, settingsRes, ordersRes } = await loadOnce()
          setProducts(productsRes)
          setCategories(categoriesRes)
          setBanners(bannersRes)
          setSettings(settingsRes)
          setOrders(ordersRes)
          setDbStatus('connected')
          setLoading(false)
          return
        } catch (err) {
          if (err.name === 'AbortError') return // this effect instance was cleaned up — a newer one is loading
          if (attempt < MAX_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, 500 * attempt))
            continue
          }
          console.warn('Falling back to demo data — could not load from the database:', err)
          setDbStatus('error')
          setDbError(err.message)
          setLoading(false)
        }
      }
    }

    loadAll()
    return () => controller.abort()
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

  // Razorpay path goes through a different endpoint (signature + amount
  // verification happen server-side before the order is even created —
  // see grafiq-api/razorpay_verify.php) but still needs to land in the
  // same local `orders` state as a normal addOrder would.
  const verifyRazorpayPayment = async (payload) => {
    const order = await api.post('/razorpay_verify.php', payload)
    setOrders((prev) => [order, ...prev])
    return order
  }

  // Re-runs the background reconciliation queue on demand (the admin
  // panel's "Verify Pending Payments" button) — the same check a cron
  // job would trigger periodically in production.
  const runPaymentQueue = () => api.post('/razorpay_queue_worker.php', {})

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
      verifyRazorpayPayment,
      runPaymentQueue,
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
