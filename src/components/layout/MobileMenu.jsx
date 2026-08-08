import { AnimatePresence, motion } from 'framer-motion'
import { NavLink } from 'react-router-dom'
import { X } from 'lucide-react'
import logo from '../../assets/logo.png'
import useScrollLock from '../../hooks/useScrollLock'

export default function MobileMenu({ open, onClose, links }) {
  useScrollLock(open)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-[80%] max-w-xs bg-ink border-r border-line z-50 flex flex-col overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-line">
              <img src={logo} alt="GRAFIQ" className="h-6 w-auto" />
              <button onClick={onClose} aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <nav className="flex flex-col p-5 gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `font-accent text-lg tracking-wide uppercase py-3 border-b border-line ${
                      isActive ? 'text-volt' : 'text-paper'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
