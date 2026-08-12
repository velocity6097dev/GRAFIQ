import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { UploadCloud, X } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/format'
import Button from '../components/ui/Button'

const BASE_GARMENTS = [
  { id: 'tee', label: 'Classic Tee', price: 599 },
  { id: 'oversized', label: 'Oversized Tee', price: 749 },
  { id: 'hoodie', label: 'Hoodie', price: 1499 }
]
const PLACEMENTS = [
  { id: 'front', label: 'Front Print', fee: 0 },
  { id: 'back', label: 'Back Print', fee: 100 },
  { id: 'both', label: 'Front & Back', fee: 180 }
]
const COLORS = ['Black', 'White', 'Grey']
const SIZES = ['S', 'M', 'L', 'XL', 'XXL']

export default function DesignYourOwn() {
  const { settings } = useStore()
  const { addToCart } = useCart()

  const [garment, setGarment] = useState(BASE_GARMENTS[0].id)
  const [color, setColor] = useState('Black')
  const [size, setSize] = useState('M')
  const [placement, setPlacement] = useState('front')
  const [artwork, setArtwork] = useState(null)
  const [notes, setNotes] = useState('')
  const [added, setAdded] = useState(false)

  const selectedGarment = BASE_GARMENTS.find((g) => g.id === garment)
  const selectedPlacement = PLACEMENTS.find((p) => p.id === placement)

  const total = useMemo(
    () => selectedGarment.price + selectedPlacement.fee,
    [selectedGarment, selectedPlacement]
  )

  const handleUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setArtwork(reader.result)
    reader.readAsDataURL(file)
  }

  const handleAddToCart = () => {
    addToCart({
      productId: `custom-${garment}-${Date.now()}`,
      garmentId: garment,
      name: `Custom ${selectedGarment.label}`,
      image: artwork || 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600&q=80',
      price: total,
      discount: 0,
      size,
      color,
      qty: 1,
      isCustom: true,
      customDesign: { placement, notes, hasArtwork: !!artwork }
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      <p className="font-accent text-volt tracking-widest text-sm mb-2 uppercase">
        Your idea, our creation
      </p>
      <h1 className="font-display text-4xl md:text-5xl uppercase mb-10">
        Design <span className="text-volt">Your Own</span>
      </h1>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative aspect-square bg-panel border border-line flex items-center justify-center overflow-hidden"
        >
          <div
            className={`w-2/3 h-2/3 rounded-sm ${
              color === 'Black' ? 'bg-neutral-900' : color === 'White' ? 'bg-neutral-100' : 'bg-neutral-500'
            } relative flex items-center justify-center border border-line`}
          >
            {artwork ? (
              <img
                src={artwork}
                alt="Your uploaded design preview"
                className="w-1/2 h-1/2 object-contain"
              />
            ) : (
              <span className="text-xs text-slate text-center px-6">
                Your artwork preview appears here
              </span>
            )}
          </div>
          <span className="absolute bottom-4 left-4 text-xs text-slate font-accent uppercase tracking-wide">
            {selectedGarment.label} · {color} · {selectedPlacement.label}
          </span>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-col gap-8">
          <div>
            <p className="font-accent uppercase tracking-wide text-sm mb-3">1. Choose Base Garment</p>
            <div className="grid grid-cols-3 gap-3">
              {BASE_GARMENTS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGarment(g.id)}
                  className={`border p-3 text-center text-sm ${
                    garment === g.id ? 'border-volt text-volt' : 'border-paper/25 text-slate'
                  }`}
                >
                  <p className="font-accent uppercase">{g.label}</p>
                  <p className="text-xs mt-1">{formatPrice(g.price, settings.currencySymbol)}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-accent uppercase tracking-wide text-sm mb-3">2. Upload Your Artwork</p>
            {artwork ? (
              <div className="flex items-center gap-3 border border-line p-3">
                <img src={artwork} alt="" className="w-14 h-14 object-cover" />
                <span className="text-sm text-slate flex-1">Artwork ready</span>
                <button onClick={() => setArtwork(null)} aria-label="Remove artwork">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border border-dashed border-line p-8 cursor-pointer hover:border-volt">
                <UploadCloud size={26} className="text-volt" />
                <span className="text-sm text-slate">Click to upload PNG / JPG (max 10MB)</span>
                <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              </label>
            )}
          </div>

          <div>
            <p className="font-accent uppercase tracking-wide text-sm mb-3">3. Print Placement</p>
            <div className="flex gap-2 flex-wrap">
              {PLACEMENTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlacement(p.id)}
                  className={`px-4 py-2 text-sm border ${
                    placement === p.id ? 'border-volt text-volt' : 'border-paper/25 text-slate'
                  }`}
                >
                  {p.label} {p.fee > 0 && `(+${formatPrice(p.fee, settings.currencySymbol)})`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="font-accent uppercase tracking-wide text-sm mb-3">4. Colour</p>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`px-3 py-2 text-sm border ${
                      color === c ? 'border-volt text-volt' : 'border-paper/25 text-slate'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-accent uppercase tracking-wide text-sm mb-3">5. Size</p>
              <div className="flex gap-2 flex-wrap">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`w-10 h-10 text-sm border ${
                      size === s ? 'border-volt text-volt' : 'border-paper/25 text-slate'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="font-accent uppercase tracking-wide text-sm mb-3">6. Notes for our team (optional)</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. keep the print centered, use a smaller size, etc."
              className="w-full bg-transparent border border-paper/25 focus:border-volt outline-none px-3 py-2.5 min-h-[80px] placeholder:text-slate"
            />
          </div>

          <div className="flex items-center justify-between border-t border-line pt-6">
            <div>
              <p className="text-xs text-slate uppercase font-accent">Total</p>
              <p className="font-display text-2xl text-volt">
                {formatPrice(total, settings.currencySymbol)}
              </p>
            </div>
            <Button variant="primary" onClick={handleAddToCart}>
              {added ? 'Added to Bag ✓' : 'Add to Bag'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
