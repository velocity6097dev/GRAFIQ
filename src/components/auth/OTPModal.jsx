import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import PhoneOtpFlow from './PhoneOtpFlow'

// Centering via `fixed` + `top/left-1/2` + `-translate-x/y-1/2` is brittle
// on mobile: if anything on the page causes even slight horizontal
// overflow, the browser's layout viewport can end up wider than the
// visible screen, and percentage-based centering math is computed against
// that wider (invisible) width — so the modal drifts off to the side
// instead of sitting centered on what the user can actually see.
// A flex container that centers its child has no such dependency on
// viewport width math, so it can't drift regardless of page width.
export default function OTPModal({ open, onClose, onSuccess }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-ink border border-line p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <p className="font-accent uppercase tracking-wide text-lg">Verify it's you</p>
              <button onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <PhoneOtpFlow
              onSuccess={() => {
                onSuccess?.()
                onClose?.()
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
