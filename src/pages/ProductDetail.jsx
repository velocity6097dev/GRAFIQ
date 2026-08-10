import { useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, Star, Minus, Plus, Truck, ShieldCheck } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import PriceTag from '../components/product/PriceTag'
import Button from '../components/ui/Button'
import LoadingImage from '../components/ui/LoadingImage'
import CircleLoader from '../components/ui/CircleLoader'
import RecommendedSlider from '../components/home/RecommendedSlider'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products, categories, loading } = useStore()
  const { addToCart } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()

  const product = products.find((p) => p.id === id)
  const [activeImage, setActiveImage] = useState(0)
  const [size, setSize] = useState(product?.sizes?.[0] || '')
  const [color, setColor] = useState(product?.colors?.[0] || '')
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('description')
  const [added, setAdded] = useState(false)

  const related = useMemo(
    () =>
      product
        ? products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
        : [],
    [products, product]
  )

  if (!product) {
    // Still waiting on the initial fetch — this specific product may
    // well exist, we just don't have the data yet. Only claim it's
    // missing once loading has actually finished.
    if (loading) {
      return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-24 flex justify-center">
          <CircleLoader size={64} />
        </div>
      )
    }
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-24 text-center">
        <p className="font-accent text-2xl mb-4">Product not found</p>
        <Button variant="primary" onClick={() => navigate('/shop')}>Back to Shop</Button>
      </div>
    )
  }

  const category = categories.find((c) => c.id === product.categoryId)
  const wished = isWishlisted(product.id)

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      name: product.name,
      image: product.images[0],
      price: product.price,
      discount: product.discount,
      size,
      color,
      qty
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <div className="text-xs text-slate mb-6 flex gap-2">
        <Link to="/" className="hover:text-volt">Home</Link> /
        <Link to="/shop" className="hover:text-volt">Shop</Link> /
        {category && (
          <Link to={`/shop?category=${category.id}`} className="hover:text-volt">{category.name}</Link>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <div className="aspect-[4/5] bg-panel border border-line overflow-hidden mb-3">
            <LoadingImage
              src={product.images[activeImage]}
              alt={product.name}
              className="w-full h-full"
              imgClassName="w-full h-full object-cover"
              loaderSize={56}
            />
          </div>
          <div className="flex gap-3">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={`w-20 h-24 border overflow-hidden ${
                  i === activeImage ? 'border-volt' : 'border-line'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex justify-between items-start gap-4">
            <h1 className="font-display text-3xl md:text-4xl uppercase">{product.name}</h1>
            <button
              onClick={() => toggleWishlist(product.id)}
              className="w-11 h-11 shrink-0 flex items-center justify-center border border-line hover:border-volt"
              aria-label="Toggle wishlist"
            >
              <Heart size={18} className={wished ? 'fill-volt stroke-volt' : ''} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-2 text-sm text-slate">
            <Star size={14} className="fill-volt stroke-volt" />
            <span className="text-paper">{product.rating}</span>
            <span>({product.reviews} reviews)</span>
          </div>

          <div className="mt-4">
            <PriceTag price={product.price} discount={product.discount} size="lg" />
          </div>

          <p className="text-slate mt-4 leading-relaxed">{product.description}</p>

          {product.colors?.length > 0 && (
            <div className="mt-6">
              <p className="font-accent uppercase text-sm tracking-wide mb-2">
                Colour: <span className="text-volt">{color}</span>
              </p>
              <div className="flex gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`px-4 py-2 text-sm border ${
                      color === c ? 'border-volt text-volt' : 'border-paper/25 text-slate'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.sizes?.length > 0 && (
            <div className="mt-6">
              <p className="font-accent uppercase text-sm tracking-wide mb-2">
                Size: <span className="text-volt">{size}</span>
              </p>
              <div className="flex gap-2 flex-wrap">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`w-11 h-11 text-sm border ${
                      size === s ? 'border-volt text-volt' : 'border-paper/25 text-slate'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="font-accent uppercase text-sm tracking-wide mb-2">Quantity</p>
            <div className="flex items-center border border-paper/25 w-fit">
              <button className="p-3" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                <Minus size={14} />
              </button>
              <span className="w-10 text-center">{qty}</span>
              <button className="p-3" onClick={() => setQty((q) => q + 1)} aria-label="Increase">
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
            >
              {product.stock === 0 ? 'Sold Out' : added ? 'Added ✓' : 'Add to Cart'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8 border-t border-line pt-6">
            <div className="flex items-center gap-2 text-sm text-slate">
              <Truck size={16} className="text-volt" /> Ships in 2–4 days
            </div>
            <div className="flex items-center gap-2 text-sm text-slate">
              <ShieldCheck size={16} className="text-volt" /> 7-day easy returns
            </div>
          </div>

          <div className="mt-8">
            <div className="flex gap-6 border-b border-line">
              {['description', 'shipping'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`pb-3 font-accent uppercase text-sm tracking-wide ${
                    tab === t ? 'text-volt border-b-2 border-volt' : 'text-slate'
                  }`}
                >
                  {t === 'description' ? 'Details' : 'Shipping & Returns'}
                </button>
              ))}
            </div>
            <div className="py-5 text-sm text-slate leading-relaxed">
              {tab === 'description' ? (
                <p>{product.description} Printed with eco-friendly ink on premium cotton fabric.</p>
              ) : (
                <p>
                  Orders are processed within 24 hours and shipped in 2–4 business days.
                  Not happy with the fit or print? Return it within 7 days of delivery for a
                  full refund.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {related.length > 0 && (
        <div className="mt-10">
          <RecommendedSlider
            eyebrow="Complete the look"
            title="You May"
            highlight="Also Like"
            products={related}
          />
        </div>
      )}
    </div>
  )
}
