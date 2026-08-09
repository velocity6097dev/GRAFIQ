import { useEffect, useState } from 'react'
import { useStore } from '../../context/StoreContext'
import CircleLoader from './CircleLoader'

// Covers the page while the initial fetch (products, categories, banners,
// settings, orders — see StoreContext) is still in flight, so nothing
// renders half-loaded for a moment. Fades out and unmounts once
// StoreContext.loading goes false, whether that's because the data
// arrived or because it gave up retrying — either way the site
// underneath is ready to show something.
export default function BootLoader() {
  const { loading } = useStore()
  const [mounted, setMounted] = useState(true)
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    if (loading) return
    setHiding(true)
    const t = setTimeout(() => setMounted(false), 700)
    return () => clearTimeout(t)
  }, [loading])

  if (!mounted) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-ink flex items-center justify-center transition-opacity duration-[600ms] ease-in-out ${
        hiding ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <CircleLoader size={180} />
    </div>
  )
}
