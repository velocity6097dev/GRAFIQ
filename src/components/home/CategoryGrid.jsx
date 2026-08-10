import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useStore } from '../../context/StoreContext'
import SectionHeading from '../ui/SectionHeading'
import LoadingImage from '../ui/LoadingImage'
import CircleLoader from '../ui/CircleLoader'

export default function CategoryGrid() {
  const { categories, loading } = useStore()

  if (categories.length === 0 && !loading) return null

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mb-20">
      <SectionHeading eyebrow="Browse" title="Shop by" highlight="Category" />
      {categories.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-square bg-panel border border-line flex items-center justify-center">
              {i === 2 && <CircleLoader size={32} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <Link to={`/shop?category=${cat.id}`} className="group block relative overflow-hidden">
                <div className="aspect-square overflow-hidden bg-panel border border-line">
                  <LoadingImage
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full"
                    imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                    loaderSize={32}
                  />
                </div>
                <div className="absolute inset-0 flex items-end p-3 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent">
                  <p className="font-accent uppercase tracking-wide text-sm md:text-base">
                    {cat.name}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}
