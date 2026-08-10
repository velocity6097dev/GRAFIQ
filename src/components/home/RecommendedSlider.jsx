import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading'
import ProductCard from '../product/ProductCard'
import CircleLoader from '../ui/CircleLoader'

export default function RecommendedSlider({ eyebrow = 'Just for you', title = 'Recommended', highlight = 'Picks', products, loading }) {
  const trackRef = useRef(null)

  if (!products.length && !loading) return null

  const scrollBy = (dir) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mb-20">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        highlight={highlight}
        action={
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => scrollBy(-1)}
              className="w-9 h-9 flex items-center justify-center border border-line hover:border-volt"
              aria-label="Scroll left"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollBy(1)}
              className="w-9 h-9 flex items-center justify-center border border-line hover:border-volt"
              aria-label="Scroll right"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />
      {!products.length ? (
        <div className="flex gap-4 md:gap-6 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="min-w-[190px] md:min-w-[260px] aspect-[4/5] bg-panel border border-line flex items-center justify-center"
            >
              {i === 1 && <CircleLoader size={36} />}
            </div>
          ))}
        </div>
      ) : (
        <div
          ref={trackRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-2"
        >
          {products.map((p) => (
            <div key={p.id} className="min-w-[190px] md:min-w-[260px] snap-start">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
