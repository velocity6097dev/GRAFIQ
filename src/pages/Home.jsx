import { useMemo } from 'react'
import { useStore } from '../context/StoreContext'
import HeroBanner from '../components/home/HeroBanner'
import FeatureStrip from '../components/home/FeatureStrip'
import CategoryGrid from '../components/home/CategoryGrid'
import ProductGrid from '../components/home/ProductGrid'
import RecommendedSlider from '../components/home/RecommendedSlider'
import DesignYourOwnCTA from '../components/home/DesignYourOwnCTA'

export default function Home() {
  const { products, loading } = useStore()

  const newArrivals = useMemo(() => products.filter((p) => p.tags?.includes('new')), [products])
  const bestsellers = useMemo(
    () => products.filter((p) => p.tags?.includes('bestseller')),
    [products]
  )
  const recommended = useMemo(
    () => [...products].sort((a, b) => (b.rating || 0) - (a.rating || 0)),
    [products]
  )
  const onDiscount = useMemo(() => products.filter((p) => p.discount > 0), [products])

  return (
    <div>
      <HeroBanner />
      <FeatureStrip />
      <CategoryGrid />
      <ProductGrid
        eyebrow="Fresh off the press"
        title="New"
        highlight="Arrivals"
        products={newArrivals.length ? newArrivals : products}
        viewAllLink="/shop"
        loading={loading}
      />
      <DesignYourOwnCTA />
      {(onDiscount.length > 0 || loading) && (
        <ProductGrid
          eyebrow="Limited time"
          title="On"
          highlight="Discount"
          products={onDiscount}
          viewAllLink="/shop?discount=1"
          loading={loading}
        />
      )}
      <RecommendedSlider
        eyebrow="Just for you"
        title="Recommended"
        highlight="For You"
        products={recommended}
        loading={loading}
      />
      {(bestsellers.length > 0 || loading) && (
        <ProductGrid
          eyebrow="Fan favourites"
          title="Best"
          highlight="Sellers"
          products={bestsellers}
          viewAllLink="/shop"
          loading={loading}
        />
      )}
    </div>
  )
}
