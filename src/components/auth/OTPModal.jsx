import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import PhoneOtpFlow from './PhoneOtpFlow'

export default function OTPModal({ open, onClose, onSuccess }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[92%] max-w-sm bg-ink border border-line p-6"
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
        </>
      )}
    </AnimatePresence>
  )
}
