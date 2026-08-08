import { Shirt, Palette, User, Truck } from 'lucide-react'
import { useStore } from '../../context/StoreContext'

const iconMap = { shirt: Shirt, palette: Palette, user: User, truck: Truck }

export default function FeatureStrip() {
  const { settings } = useStore()

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 -mt-2 mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 border border-line divide-x divide-y md:divide-y-0 divide-line">
        {settings.features.map((f) => {
          const Icon = iconMap[f.icon] || Shirt
          return (
            <div key={f.id} className="flex items-center gap-3 p-5">
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
