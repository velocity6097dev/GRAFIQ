import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

// See OTPModal.jsx for why this uses flex-centering instead of
// fixed + top/left-1/2 + translate.
export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full ${maxWidth} max-h-[86vh] overflow-y-auto bg-panel border border-line p-6 my-8`}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="font-accent uppercase tracking-wide text-lg">{title}</p>
              <button onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
