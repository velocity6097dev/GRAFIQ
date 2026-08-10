import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import SectionHeading from '../ui/SectionHeading'
import ProductCard from '../product/ProductCard'
import CircleLoader from '../ui/CircleLoader'

export default function ProductGrid({ eyebrow, title, highlight, products, viewAllLink, loading }) {
  if (!products.length && !loading) return null

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mb-20">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        highlight={highlight}
        action={
          viewAllLink && (
            <Link
              to={viewAllLink}
              className="font-accent text-sm uppercase tracking-wide flex items-center gap-1 hover:text-volt"
            >
              View All <ArrowRight size={14} />
            </Link>
          )
        }
      />
      {!products.length ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-panel border border-line flex items-center justify-center">
              {i === 1 && <CircleLoader size={36} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.slice(0, 8).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  )
}
