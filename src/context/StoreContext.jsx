import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from './AuthContext'

const StoreContext = createContext(null)

// A structurally-safe placeholder — enough that components destructuring
// `settings.storeName` etc. before the real fetch resolves don't crash —
// but deliberately NOT the old seed/demo content that used to live here.
// That old content (from src/data/*.js) was only ever meant for local
// development before a database existed; keeping it as the initial state
// meant real shoppers could briefly see stale placeholder products/
// banners/categories flash on screen before the live DB data swapped in.
// Products/categories/banners now start empty instead — see the `loading`
// flag exposed below for pages that want to show a lightweight spinner
// during that (normally sub-second, on a local DB) gap rather than an
// empty section.
const EMPTY_SETTINGS = {
  storeName: 'GRAFIQ',
  tagline: '',
  tickerText: '',
  deliveryFee: 0,
  freeDeliveryAbove: 0,
  contactEmail: '',
  contactPhone: '',
  instagram: '',
  facebook: '',
  twitter: '',
  features: [],
  codAdvancePercent: 0
}

export function StoreProvider({ children }) {
  const { isAdmin, user } = useAuth()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [banners, setBanners] = useState([])
  const [settings, setSettings] = useState(EMPTY_SETTINGS)
  // Admin-scoped (every order/replacement in the store — only ever
  // fetched, and only ever populated, while isAdmin is true; see the
  // effect below) vs customer-scoped (just the signed-in customer's own
  // — via orders.php/replacements.php's ?mine=1, scoped server-side to
  // their session, see the effect below that). These used to be one
  // shared `orders`/`replacements` pair fetched unconditionally for
  // every visitor on every page load — which meant literally every
  // browser that ever opened this site downloaded the entire orders
  // table, admin or not, logged in or not. Account.jsx used to get "my
  // orders" by filtering that global dump down to the signed-in phone
  // number, client-side, in the browser. Now each is fetched only when
  // (and only as much as) it's actually needed.
  const [orders, setOrders] = useState([])
  const [replacements, setReplacements] = useState([])
  const [myOrders, setMyOrders] = useState([])
  const [myReplacements, setMyReplacements] = useState([])

  const [loading, setLoading] = useState(true)
  // 'connected' | 'error' | 'checking' — surfaced so the UI can warn the
  // person if XAMPP/MySQL isn't reachable instead of failing silently.
  const [dbStatus, setDbStatus] = useState('checking')
  const [dbError, setDbError] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    // React 18 StrictMode runs this effect twice in development (mount →
    // cleanup → mount again) purely to help catch bugs — without an
    // AbortController, the first mount's requests keep running in the
    // background even after being "cancelled" locally, doubling up load
    // on Apache/MySQL right at startup. Actually aborting them, plus a
    // couple of quick retries for the normal cold-start hiccup (first
    // request after XAMPP just started, or a transient MySQL blip on
    // shared hosting), is what fixes the "shows disconnected until I
    // refresh" symptom instead of just hiding it. api/client.js already
    // retries each individual GET a couple of times on its own for the
    // same reason — this outer loop is one more layer on top of that,
    // for the case where several of the four calls below fail together
    // (e.g. the DB was still down for the whole first attempt).
    async function loadOnce() {
      const [productsRes, categoriesRes, bannersRes, settingsRes] = await Promise.all([
        api.get('/products.php', { signal: controller.signal }),
        api.get('/categories.php', { signal: controller.signal }),
        api.get('/banners.php', { signal: controller.signal }),
        api.get('/settings.php', { signal: controller.signal })
      ])
      return { productsRes, categoriesRes, bannersRes, settingsRes }
    }

    async function loadAll() {
      const MAX_ATTEMPTS = 3
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const { productsRes, categoriesRes, bannersRes, settingsRes } = await loadOnce()
          setProducts(productsRes)
          setCategories(categoriesRes)
          setBanners(bannersRes)
          setSettings(settingsRes)
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

  // Admin-only order/replacement data — fetched only once there's a
  // signed-in admin session, and cleared again the moment there isn't
  // (logout, or an expired token AuthContext noticed on load) so a
  // previously-admin browser tab doesn't keep holding onto a full order
  // dump in memory after signing out.
  useEffect(() => {
    if (!isAdmin) {
      setOrders([])
      setReplacements([])
      return
    }
    const controller = new AbortController()
    Promise.all([
      api.get('/orders.php', { signal: controller.signal }),
      api.get('/replacements.php', { signal: controller.signal })
    ])
      .then(([ordersRes, replacementsRes]) => {
        setOrders(ordersRes)
        setReplacements(replacementsRes)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.warn('Could not load admin order data:', err)
      })
    return () => controller.abort()
  }, [isAdmin])

  // A signed-in customer's own orders/replacements — scoped server-side
  // to their session (see orders.php/replacements.php's `mine=1`
  // branch), never derived by filtering a bigger list client-side.
  useEffect(() => {
    if (!user) {
      setMyOrders([])
      setMyReplacements([])
      return
    }
    const controller = new AbortController()
    Promise.all([
      api.get('/orders.php?mine=1', { signal: controller.signal }),
      api.get('/replacements.php?mine=1', { signal: controller.signal })
    ])
      .then(([ordersRes, replacementsRes]) => {
        setMyOrders(ordersRes)
        setMyReplacements(replacementsRes)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.warn('Could not load your orders:', err)
      })
    return () => controller.abort()
  }, [user])

  // Every order-mutating action below (placing an order, admin editing
  // one, a courier being booked, etc.) needs to land in whichever of
  // orders/myOrders is actually relevant to whoever's calling it — an
  // admin action updates `orders`, a customer action updates `myOrders`.
  // Rather than have every function guess, both helpers just update
  // whichever of the two arrays already contains that order (or, for a
  // freshly-created order, prepend to both — one of the two is always an
  // empty no-op array for whichever role isn't the caller, so this is
  // harmless either way).
  const addOrderToState = (order) => {
    setOrders((prev) => [order, ...prev])
    setMyOrders((prev) => [order, ...prev])
  }
  const patchOrderInState = (id, updated) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
    setMyOrders((prev) => prev.map((o) => (o.id === id ? updated : o)))
  }
  const addReplacementToState = (replacement) => {
    setReplacements((prev) => [replacement, ...prev])
    setMyReplacements((prev) => [replacement, ...prev])
  }
  const patchReplacementInState = (id, updated) => {
    setReplacements((prev) => prev.map((r) => (r.id === id ? updated : r)))
    setMyReplacements((prev) => prev.map((r) => (r.id === id ? updated : r)))
  }


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
    addOrderToState(order)
    return order
  }

  // Razorpay path goes through a different endpoint (signature + amount
  // verification happen server-side before the order is even created —
  // see grafiq-api/razorpay_verify.php) but still needs to land in the
  // same local order state as a normal addOrder would.
  const verifyRazorpayPayment = async (payload) => {
    const order = await api.post('/razorpay_verify.php', payload)
    addOrderToState(order)
    return order
  }

  // Re-runs the background reconciliation queue on demand (the admin
  // panel's "Verify Pending Payments" button) — the same check a cron
  // job would trigger periodically in production.
  const runPaymentQueue = () => api.post('/razorpay_queue_worker.php', {})

  const updateOrderStatus = async (id, status) => {
    const updated = await api.put(`/orders.php?id=${id}`, { status })
    patchOrderInState(id, updated)
    return updated
  }

  // Merges shipping/tracking info into an order — used both for the manual
  // "type in a tracking ID" path and for the compare-and-book courier flow.
  const updateOrderShipping = async (id, shippingPatch) => {
    const updated = await api.put(`/orders.php?id=${id}`, { shipping: shippingPatch })
    patchOrderInState(id, updated)
    return updated
  }

  // Customer-initiated cancellation. The backend independently enforces
  // ownership (from the customer's own session now, not a client-
  // supplied phone) + the "only before Shipped" rule (see
  // grafiq-api/order_cancel.php) — this isn't just a UI nicety, a
  // rejected request throws here with the server's reason.
  const cancelOrder = async (orderId, reason) => {
    const updated = await api.post('/order_cancel.php', { orderId, reason })
    patchOrderInState(orderId, updated)
    return updated
  }

  // Admin-only: retry/adjust a refund status by hand (e.g. after
  // manually confirming a refund went through, or retrying one that
  // initially failed).
  const updateOrderRefundStatus = async (id, refundStatus) => {
    const updated = await api.put(`/orders.php?id=${id}`, { refundStatus })
    patchOrderInState(id, updated)
    return updated
  }

  // Admin-only: free-text internal notes on an order (never shown to
  // customers).
  const updateOrderNotes = async (id, adminNotes) => {
    const updated = await api.put(`/orders.php?id=${id}`, { adminNotes })
    patchOrderInState(id, updated)
    return updated
  }

  // Admin-only: re-checks the order's linked Razorpay payment directly
  // against Razorpay's API (independent of the background queue worker) —
  // the "Verify Payment" button in the order's Payment section.
  const verifyOrderPayment = async (id) => {
    const updated = await api.post('/payment_action.php', { orderId: id, action: 'verify' })
    patchOrderInState(id, updated)
    return updated
  }

  // Admin-only: issues a refund (full, or a manually-chosen partial
  // amount — e.g. a COD advance minus shipping charges) against the
  // order's linked Razorpay payment.
  const refundOrderPayment = async (id, amount) => {
    const updated = await api.post('/payment_action.php', { orderId: id, action: 'refund', amount })
    patchOrderInState(id, updated)
    return updated
  }

  // Admin-only: books (or, if this order already has a Shiprocket
  // shipment, reassigns the AWB on that same shipment to a different
  // courier — a "Change Courier" rebook) a real Shiprocket shipment.
  // `payload` is { courierId, rate, etaDays } from whichever quote the
  // admin picked in the Compare Couriers list (see getShiprocketRates
  // below) — see grafiq-api/shiprocket_action.php for what actually
  // happens with it.
  const bookShiprocketCourier = async (orderId, payload) => {
    const updated = await api.post('/shiprocket_action.php', { orderId, action: 'book', ...payload })
    patchOrderInState(orderId, updated)
    return updated
  }

  // Admin-only: cancels the Shiprocket order/shipment linked to this
  // order (does not touch the order's own status — that's a separate,
  // deliberate choice from the status dropdown).
  const cancelShiprocketShipment = async (orderId) => {
    const updated = await api.post('/shiprocket_action.php', { orderId, action: 'cancel' })
    patchOrderInState(orderId, updated)
    return updated
  }

  // Live courier rate comparison for one order — read-only, doesn't touch
  // order state, so it's not wrapped in a patchOrderInState call like the
  // actions above. Returns { quotes, weight }.
  const getShiprocketRates = (orderId) => api.post('/shiprocket_action.php', { orderId, action: 'rates' })

  // Live shipment status + Shiprocket's own tracking page URL for one
  // order. Returns { status, trackUrl }.
  const trackShiprocketShipment = (orderId) => api.post('/shiprocket_action.php', { orderId, action: 'track' })

  // ---------- Replacements ----------
  const requestReplacement = async (payload) => {
    const created = await api.post('/replacements.php', payload)
    addReplacementToState(created)
    return created
  }

  // Admin-only: move a replacement through its own status timeline and/or
  // attach courier + tracking info.
  const updateReplacement = async (id, patch) => {
    const updated = await api.put(`/replacements.php?id=${id}`, patch)
    patchReplacementInState(id, updated)
    return updated
  }

  const value = useMemo(
    () => ({
      products,
      categories,
      banners: [...banners].sort((a, b) => a.order - b.order),
      settings,
      orders,
      replacements,
      myOrders,
      myReplacements,
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
      updateOrderShipping,
      bookShiprocketCourier,
      cancelShiprocketShipment,
      getShiprocketRates,
      trackShiprocketShipment,
      cancelOrder,
      updateOrderRefundStatus,
      updateOrderNotes,
      verifyOrderPayment,
      refundOrderPayment,
      requestReplacement,
      updateReplacement
    }),
    [products, categories, banners, settings, orders, replacements, myOrders, myReplacements, loading, dbStatus, dbError]
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
