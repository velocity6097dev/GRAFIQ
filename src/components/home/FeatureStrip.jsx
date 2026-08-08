import { Shirt, Palette, User, Truck } from 'lucide-react'
import { useStore } from '../../context/StoreContext'

const iconMap = { shirt: Shirt, palette: Palette, user: User, truck: Truck }

// `divide-x`/`divide-y` add borders based on DOM order ("every child after
// the first"), which only lines up correctly when the column count never
// changes. Here the grid is 2 columns on mobile and 4 on desktop, so the
// old divide-* classes put a stray border-top through the 2nd card instead
// of at the actual row boundary. Each cell now declares its own border
// explicitly, per breakpoint, so it always lands on a real edge.
const cellBorders = [
  'border-r border-b border-line md:border-b-0',
  'border-b border-line md:border-r md:border-b-0',
  'border-r border-line',
  ''
]

export default function FeatureStrip() {
  const { settings } = useStore()
  const features = settings.features || []

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mt-8 mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 border border-line">
        {features.map((f, i) => {
          const Icon = iconMap[f.icon] || Shirt
          const border = features.length === 4 ? cellBorders[i] : ''
          return (
            <div key={f.id} className={`flex items-center gap-3 p-5 ${border}`}>
              <Icon size={26} className="text-volt shrink-0" />
              <div>
                <p className="font-accent tracking-wide text-sm uppercase">{f.title}</p>
                <p className="text-xs text-slate">{f.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
