import { Link } from 'react-router-dom'
import { Instagram, Facebook, Twitter } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import logo from '../../assets/logo.png'
import xMarks from '../../assets/brand/x-marks.webp'
import barcode from '../../assets/brand/barcode.webp'

export default function Footer() {
  const { settings, categories } = useStore()

  return (
    <footer className="bg-ink border-t border-line mt-24">
      <div className="overflow-hidden border-b border-line py-4">
        <div className="flex whitespace-nowrap animate-marquee">
          {[...Array(2)].map((_, i) => (
            <span key={i} className="font-accent text-2xl md:text-3xl tracking-wide px-6">
              {settings.tickerText.split('. ').map((chunk, idx) => (
                <span key={idx}>
                  {idx % 2 === 0 ? chunk : <span className="text-volt">{chunk}</span>}
                  {'. '}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <img src={logo} alt={settings.storeName} className="h-8 w-auto mb-3" />
          <p className="text-slate text-sm max-w-xs">{settings.tagline}</p>
          <div className="flex gap-3 mt-4">
            <a href={settings.instagram} target="_blank" rel="noreferrer" className="hover:text-volt">
              <Instagram size={18} />
            </a>
            <a href={settings.facebook} target="_blank" rel="noreferrer" className="hover:text-volt">
              <Facebook size={18} />
            </a>
            <a href={settings.twitter} target="_blank" rel="noreferrer" className="hover:text-volt">
              <Twitter size={18} />
            </a>
          </div>
        </div>

        <div>
          <p className="font-accent tracking-wide text-volt mb-3">Shop</p>
          <ul className="flex flex-col gap-2 text-sm text-slate">
            {categories.slice(0, 5).map((c) => (
              <li key={c.id}>
                <Link to={`/shop?category=${c.id}`} className="hover:text-paper">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-accent tracking-wide text-volt mb-3">Company</p>
          <ul className="flex flex-col gap-2 text-sm text-slate">
            <li><Link to="/about" className="hover:text-paper">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-paper">Contact</Link></li>
            <li><Link to="/design-your-own" className="hover:text-paper">Design Your Own</Link></li>
            <li><Link to="/account" className="hover:text-paper">My Account</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-accent tracking-wide text-volt mb-3">Get in touch</p>
          <ul className="flex flex-col gap-2 text-sm text-slate">
            <li>{settings.contactEmail}</li>
            <li>{settings.contactPhone}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line px-4 md:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate">
        <div className="flex items-center gap-4">
          <img src={xMarks} alt="" aria-hidden="true" className="h-4 w-auto opacity-70 hidden sm:block" />
          <span>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">Made with heavyweight cotton and bad intentions.</span>
          <img src={barcode} alt={settings.storeName} className="h-7 w-auto" />
        </div>
      </div>
    </footer>
  )
}
