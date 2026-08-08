import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../context/StoreContext'
import ProductCard from '../components/product/ProductCard'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' }
]

export default function Shop() {
  const { products, categories } = useStore()
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeCategory = params.get('category') || ''
  const query = (params.get('q') || '').toLowerCase()
  const discountOnly = params.get('discount') === '1'
  const sort = params.get('sort') || 'newest'
  const maxPrice = Number(params.get('maxPrice') || 3000)

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value === '' || value == null) next.delete(key)
    else next.set(key, value)
    setParams(next)
  }

  const filtered = useMemo(() => {
    let list = [...products]
    if (activeCategory) list = list.filter((p) => p.categoryId === activeCategory)
    if (query) list = list.filter((p) => p.name.toLowerCase().includes(query))
    if (discountOnly) list = list.filter((p) => p.discount > 0)
    list = list.filter((p) => p.price <= maxPrice)

    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        list.sort((a, b) => b.price - a.price)
        break
      case 'popular':
        list.sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
        break
      default:
        list.sort((a, b) => (b.tags?.includes('new') ? 1 : 0) - (a.tags?.includes('new') ? 1 : 0))
    }
    return list
  }, [products, activeCategory, query, discountOnly, sort, maxPrice])

  const FiltersPanel = (
    <div className="flex flex-col gap-8">
      <div>
        <p className="font-accent uppercase tracking-wide text-volt mb-3">Category</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setParam('category', '')}
            className={`text-left text-sm py-1 ${!activeCategory ? 'text-volt' : 'text-slate hover:text-paper'}`}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setParam('category', c.id)}
              className={`text-left text-sm py-1 ${activeCategory === c.id ? 'text-volt' : 'text-slate hover:text-paper'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="font-accent uppercase tracking-wide text-volt mb-3">Max Price: ₹{maxPrice}</p>
        <input
          type="range"
          min="300"
          max="3000"
          step="50"
          value={maxPrice}
          onChange={(e) => setParam('maxPrice', e.target.value)}
          className="w-full accent-[#CAD600]"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={discountOnly}
          onChange={(e) => setParam('discount', e.target.checked ? '1' : '')}
          className="accent-[#CAD600] w-4 h-4"
        />
        <span className="text-sm">On Discount Only</span>
      </label>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl uppercase">
            {query ? `Results for "${query}"` : 'Shop All'}
          </h1>
          <p className="text-slate text-sm mt-1">{filtered.length} products</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden flex items-center gap-2 border border-line px-4 py-2 font-accent text-sm uppercase"
          >
            <SlidersHorizontal size={15} /> Filters
          </button>
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="bg-panel border border-line px-3 py-2 text-sm font-accent uppercase outline-none"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-10">
        <aside className="hidden lg:block">{FiltersPanel}</aside>

        <AnimatePresence>
          {filtersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 z-50 lg:hidden"
                onClick={() => setFiltersOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.3 }}
                className="fixed top-0 left-0 h-full w-[80%] max-w-xs bg-ink border-r border-line z-50 p-6 overflow-y-auto lg:hidden"
              >
                <div className="flex justify-between items-center mb-6">
                  <p className="font-accent uppercase tracking-wide">Filters</p>
                  <button onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                    <X size={20} />
                  </button>
                </div>
                {FiltersPanel}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {filtered.length === 0 ? (
          <div className="text-center py-24 text-slate">
            <p className="font-accent text-xl text-paper mb-2">No products match these filters</p>
            <p className="text-sm">Try widening the price range or clearing a filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
