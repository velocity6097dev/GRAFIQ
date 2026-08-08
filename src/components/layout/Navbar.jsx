import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Search, User, ShoppingCart, Menu, X } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useAuth } from '../../context/AuthContext'
import { useStore } from '../../context/StoreContext'
import MobileMenu from './MobileMenu'
import CartDrawer from './CartDrawer'
import logo from '../../assets/logo.png'

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Design Your Own', to: '/design-your-own' },
  { label: 'About Us', to: '/about' },
  { label: 'Contact', to: '/contact' }
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [cartOpen, setCartOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { count } = useCart()
  const { user } = useAuth()
  const { settings } = useStore()
  const navigate = useNavigate()

  const submitSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/shop?q=${encodeURIComponent(query.trim())}`)
    setSearchOpen(false)
    setQuery('')
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-ink/95 backdrop-blur border-b border-line">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <button
            className="lg:hidden p-2 -ml-2"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <Link to="/" className="flex items-center shrink-0">
            <img src={logo} alt={settings.storeName} className="h-7 md:h-8 w-auto" />
          </Link>

          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `font-accent text-sm tracking-wide uppercase transition-colors ${
                    isActive ? 'text-volt' : 'text-paper hover:text-volt'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 md:gap-2">
            <button
              className="p-2 hover:text-volt"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <Link
              to={user ? '/account' : '/login'}
              className="p-2 hover:text-volt"
              aria-label="Account"
            >
              <User size={20} />
            </Link>
            <button
              className="relative p-2 hover:text-volt"
              onClick={() => setCartOpen(true)}
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-volt text-ink text-[10px] font-bold rounded-full">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-line bg-panel px-4 md:px-8 py-3">
            <form onSubmit={submitSearch} className="max-w-7xl mx-auto flex items-center gap-3">
              <Search size={18} className="text-slate" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search designs, drops, categories..."
                className="flex-1 bg-transparent outline-none font-body placeholder:text-slate"
              />
              <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
                <X size={18} />
              </button>
            </form>
          </div>
        )}
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} links={navLinks} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
