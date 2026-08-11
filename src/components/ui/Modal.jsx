import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import useScrollLock from '../../hooks/useScrollLock'

// See OTPModal.jsx for why this uses flex-centering instead of
// fixed + top/left-1/2 + translate.
//
// Deliberately does NOT close on backdrop click. It used to (a plain
// onClick={onClose} on the overlay), but that meant drag-selecting text
// inside a field — e.g. selecting a link to copy/retype it — would close
// the modal the moment your cursor drifted past its edge before you let
// go of the mouse button: the browser fires `click` wherever the mouseup
// lands, which is the backdrop, not the field. Only the explicit close
// controls (the × button, and each form's own Cancel button) close it
// now, which is also just less surprising for a form you're mid-edit on.
export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  useScrollLock(open)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4 overflow-y-auto"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
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
