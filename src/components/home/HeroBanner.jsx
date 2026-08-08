import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import Button from '../ui/Button'

export default function HeroBanner() {
  const { banners } = useStore()
  const activeBanners = banners.filter((b) => b.active)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (activeBanners.length < 2) return
    const t = setInterval(() => setIndex((i) => (i + 1) % activeBanners.length), 5500)
    return () => clearInterval(t)
  }, [activeBanners.length])

  if (activeBanners.length === 0) return null
  const banner = activeBanners[index]

  return (
    <section className="relative overflow-hidden noise">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-16 grid md:grid-cols-2 gap-10 items-center min-h-[520px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={banner.id + '-text'}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.5 }}
          >
            <p className="font-accent text-slate tracking-widest text-sm mb-4 uppercase">
              {banner.eyebrow}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95] uppercase">
              {banner.titleLine1} {banner.titleHighlight1 && (
                <span className="text-volt">{banner.titleHighlight1}</span>
              )}
              <br />
              {banner.titleLine2} {banner.titleHighlight2 && (
                <span className="text-volt">{banner.titleHighlight2}</span>
              )}
            </h1>
            {banner.subtitle && (
              <p className="font-accent text-lg md:text-xl tracking-wide mt-3 text-paper">
                {banner.subtitle}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4 mt-8">
              {banner.ctaPrimary && (
                <Button as={Link} to={banner.ctaPrimary.link} variant="primary">
                  {banner.ctaPrimary.label} <ArrowRight size={16} />
                </Button>
              )}
              {banner.ctaSecondary && (
                <Link
                  to={banner.ctaSecondary.link}
                  className="font-accent uppercase tracking-wide text-sm border-b border-paper hover:border-volt hover:text-volt pb-1"
                >
                  {banner.ctaSecondary.label} →
                </Link>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={banner.id + '-img'}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="absolute -top-6 -right-4 tape w-24 h-8 rotate-6 hidden md:block" />
            <img
              src={banner.image}
              alt={banner.titleHighlight1 || banner.titleLine1}
              className="w-full aspect-[4/5] object-cover border border-line"
            />
            <div className="absolute -bottom-4 -left-4 tape w-24 h-8 -rotate-3 hidden md:block" />
          </motion.div>
        </AnimatePresence>
      </div>

      {activeBanners.length > 1 && (
        <div className="flex justify-center gap-2 pb-6">
          {activeBanners.map((b, i) => (
            <button
              key={b.id}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1.5 transition-all ${
                i === index ? 'w-8 bg-volt' : 'w-4 bg-line'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
