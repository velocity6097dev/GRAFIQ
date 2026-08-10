import { Routes, Route } from 'react-router-dom'
import StoreLayout from './StoreLayout'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import DesignYourOwn from './pages/DesignYourOwn'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import Login from './pages/Login'
import Account from './pages/Account'
import About from './pages/About'
import Contact from './pages/Contact'

import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import ManageProducts from './pages/admin/ManageProducts'
import ManageCategories from './pages/admin/ManageCategories'
import ManageBanners from './pages/admin/ManageBanners'
import ManageOrders from './pages/admin/ManageOrders'
import OrderDetail from './pages/admin/OrderDetail'
import ManageReplacements from './pages/admin/ManageReplacements'
import AdminSettings from './pages/admin/Settings'

export default function App() {
  return (
    <Routes>
      {/* Public storefront */}
      <Route element={<StoreLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/design-your-own" element={<DesignYourOwn />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-success/:orderId" element={<OrderSuccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={<Account />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      {/* Admin panel — separate auth, separate shell */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<ManageProducts />} />
        <Route path="categories" element={<ManageCategories />} />
        <Route path="banners" element={<ManageBanners />} />
        <Route path="orders" element={<ManageOrders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="replacements" element={<ManageReplacements />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex flex-col items-center justify-center bg-ink text-paper gap-4">
            <p className="font-display text-4xl">404</p>
            <p className="text-slate">This page doesn't exist.</p>
            <a href="/" className="text-volt font-accent uppercase tracking-wide">Back Home</a>
          </div>
        }
      />
    </Routes>
  )
}
