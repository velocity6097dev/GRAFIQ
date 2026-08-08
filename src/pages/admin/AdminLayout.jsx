import { Navigate, NavLink, Outlet, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Shirt,
  FolderTree,
  GalleryHorizontal,
  ClipboardList,
  Settings as SettingsIcon,
  LogOut,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Shirt },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/banners', label: 'Banners', icon: GalleryHorizontal },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/settings', label: 'Settings', icon: SettingsIcon }
]

export default function AdminLayout() {
  const { isAdmin, adminLogout } = useAuth()

  if (!isAdmin) return <Navigate to="/admin/login" replace />

  return (
    <div className="min-h-screen flex bg-ink text-paper">
      <aside className="w-64 shrink-0 border-r border-line hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-line">
          <span className="font-display text-xl">
            GRAFI<span className="text-volt">Q</span>
          </span>
          <span className="text-xs text-slate ml-2 font-accent uppercase">Admin</span>
        </div>
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-accent uppercase tracking-wide ${
                  isActive ? 'bg-volt text-ink' : 'text-slate hover:text-paper hover:bg-panel'
                }`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-line flex flex-col gap-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-accent uppercase tracking-wide text-slate hover:text-paper hover:bg-panel"
          >
            <ExternalLink size={16} /> View Store
          </Link>
          <button
            onClick={adminLogout}
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-accent uppercase tracking-wide text-slate hover:text-paper hover:bg-panel text-left"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="h-16 border-b border-line flex items-center justify-between px-4 md:px-8 md:hidden">
          <span className="font-display text-lg">
            GRAFI<span className="text-volt">Q</span> Admin
          </span>
        </header>
        {/* Mobile admin nav */}
        <nav className="md:hidden flex overflow-x-auto border-b border-line px-4 gap-4 scrollbar-none">
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `py-3 text-xs font-accent uppercase tracking-wide whitespace-nowrap ${
                  isActive ? 'text-volt border-b-2 border-volt' : 'text-slate'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
