import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
import PriceTag from './PriceTag'
import Badge from '../ui/Badge'
import { useWishlist } from '../../context/WishlistContext'

export default function ProductCard({ product }) {
  const { isWishlisted, toggleWishlist } = useWishlist()
  const wished = isWishlisted(product.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }}
      className="group relative bg-panel border border-line"
    >
      <button
        onClick={(e) => {
          e.preventDefault()
          toggleWishlist(product.id)
        }}
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        className="absolute top-3 right-3 z-10 w-9 h-9 flex items-center justify-center bg-ink/70 backdrop-blur border border-line hover:border-volt transition-colors"
      >
        <Heart
          size={16}
          className={wished ? 'fill-volt stroke-volt' : 'stroke-paper'}
        />
      </button>

      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden bg-ink">
          <img
            src={product.images?.[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {product.images?.[1] && (
            <img
              src={product.images[1]}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            />
          )}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.tags?.includes('new') && <Badge tone="volt">New</Badge>}
            {product.tags?.includes('bestseller') && <Badge tone="dark">Bestseller</Badge>}
            {product.stock === 0 && <Badge tone="outline">Sold Out</Badge>}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-accent text-lg tracking-wide truncate">{product.name}</h3>
          <div className="mt-1">
            <PriceTag price={product.price} discount={product.discount} />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
