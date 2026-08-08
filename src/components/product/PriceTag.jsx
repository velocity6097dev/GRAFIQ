import { useStore } from '../../context/StoreContext'
import { formatPrice, getDiscountedPrice } from '../../utils/format'

export default function PriceTag({ price, discount = 0, size = 'md' }) {
  const { settings } = useStore()
  const { finalPrice, hasDiscount } = getDiscountedPrice(price, discount)
  const textSize = size === 'lg' ? 'text-2xl' : 'text-base'
  const strikeSize = size === 'lg' ? 'text-base' : 'text-sm'

  if (!hasDiscount) {
    return (
      <span className={`font-accent ${textSize} text-paper`}>
        {formatPrice(price, settings.currencySymbol)}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`font-accent ${textSize} text-volt`}>
        {formatPrice(finalPrice, settings.currencySymbol)}
      </span>
      <span className={`${strikeSize} text-slate line-through`}>
        {formatPrice(price, settings.currencySymbol)}
      </span>
      <span className="text-[11px] font-accent tracking-wide text-ink bg-volt px-1.5 py-0.5">
        {discount}% OFF
      </span>
    </div>
  )
}
