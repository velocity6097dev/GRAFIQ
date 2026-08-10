import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import { useStore } from './context/StoreContext'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// Small heads-up banner for local development: if the PHP/MySQL API
// can't be reached, the site still renders — sections just show nothing
// rather than any stale placeholder content — but nothing will save.
function DbStatusBanner() {
  const { dbStatus, dbError } = useStore()
  if (dbStatus !== 'error') return null
  return (
    <div className="bg-red-500/10 border-b border-red-500/30 text-red-300 text-xs sm:text-sm px-4 py-2 text-center">
      Not connected to the database — the store will look empty until it reconnects.{' '}
      {dbError && <span className="opacity-80">({dbError})</span>}
    </div>
  )
}

export default function StoreLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <DbStatusBanner />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
