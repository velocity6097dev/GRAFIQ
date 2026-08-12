import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useStore } from '../../context/StoreContext'

const REASONS = [
  'Ordered by mistake',
  'Found a better price elsewhere',
  'Taking too long to ship',
  'Changed my mind',
  'Other'
]

export default function CancelOrderModal({ order, open, onClose }) {
  const { cancelOrder } = useStore()
  const [reason, setReason] = useState(REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  if (!order) return null

  const handleClose = () => {
    setResult(null)
    setError('')
    onClose()
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    setError('')
    try {
      const finalReason = reason === 'Other' ? customReason.trim() || 'Other' : reason
      const updated = await cancelOrder(order.id, finalReason)
      setResult(updated)
    } catch (err) {
      setError(err.message || 'Could not cancel this order.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={result ? 'Order Cancelled' : `Cancel Order ${order.id}`}>
      {result ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate">
            Order <span className="text-paper">{result.id}</span> has been cancelled.
          </p>
          {result.paymentStatus === 'paid' && (
            <div className="border border-line p-3 text-sm">
              <p className="font-accent uppercase text-xs text-slate mb-1">Refund Status</p>
              <p className="text-volt uppercase">{result.refundStatus || 'pending'}</p>
              <p className="text-xs text-slate mt-1">
                {result.refundStatus === 'processing' &&
                  "Your refund has been initiated with Razorpay and should reflect in 5–7 business days."}
                {result.refundStatus === 'pending' &&
                  "We're processing your refund — this can take a short while to kick off."}
                {result.refundStatus === 'failed' &&
                  'Something went wrong starting the refund automatically — our team will process it manually.'}
              </p>
            </div>
          )}
          <Button variant="primary" onClick={handleClose} className="w-full">Done</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2.5 border border-volt/30 bg-volt/5 p-3 text-sm">
            <AlertTriangle size={16} className="text-volt shrink-0 mt-0.5" />
            <p className="text-slate">
              This can't be undone. Orders can only be cancelled before they ship.
            </p>
          </div>

          <div>
            <label className="text-xs font-accent uppercase text-slate mb-1.5 block">Why are you cancelling?</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-transparent border border-line px-3 py-2 text-sm outline-none focus:border-volt"
            >
              {REASONS.map((r) => (
                <option key={r} value={r} style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {reason === 'Other' && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Tell us more (optional)"
              rows={3}
              className="w-full bg-transparent border border-line px-3 py-2 text-sm outline-none focus:border-volt resize-none"
            />
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <Button variant="dark" onClick={handleClose} className="flex-1">Keep Order</Button>
            <Button variant="primary" onClick={handleConfirm} disabled={submitting} className="flex-1">
              {submitting ? 'Cancelling…' : 'Confirm Cancel'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
