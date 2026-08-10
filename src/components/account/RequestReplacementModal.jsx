import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { useStore } from '../../context/StoreContext'
import { useAuth } from '../../context/AuthContext'

const REASONS = [
  'Wrong size',
  'Wrong item received',
  'Item damaged/defective',
  'Print/design quality issue',
  'Item not as described',
  'Other'
]

export default function RequestReplacementModal({ order, open, onClose, onSubmitted }) {
  const { requestReplacement } = useStore()
  const { user } = useAuth()

  const [productId, setProductId] = useState(order?.items?.[0]?.productId || '')
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!order) return null

  const selectedItem = order.items.find((i) => i.productId === productId) || order.items[0]

  const reset = () => {
    setProductId(order?.items?.[0]?.productId || '')
    setReason(REASONS[0])
    setNote('')
    setPhotoUrl('')
    setError('')
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const created = await requestReplacement({
        orderId: order.id,
        customerPhone: user.phone,
        productId: selectedItem.productId,
        productName: selectedItem.name,
        reason,
        note,
        photoUrl
      })
      reset()
      onSubmitted?.(created)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not submit the replacement request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={`Request Replacement — ${order.id}`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-accent uppercase text-slate mb-1.5 block">Which item?</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full bg-transparent border border-line px-3 py-2 text-sm outline-none focus:border-volt"
          >
            {order.items.map((item, i) => (
              <option
                key={item.lineId || i}
                value={item.productId}
                style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
              >
                {item.name} {item.size && `(${item.size})`} × {item.qty}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-accent uppercase text-slate mb-1.5 block">Reason</label>
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

        <div>
          <label className="text-xs font-accent uppercase text-slate mb-1.5 block">
            Note <span className="normal-case text-slate/70">(optional but helps us act faster)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Describe the issue…"
            rows={3}
            className="w-full bg-transparent border border-line px-3 py-2 text-sm outline-none focus:border-volt resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-accent uppercase text-slate mb-1.5 block">
            Photo URL <span className="normal-case text-slate/70">(optional)</span>
          </label>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://…"
            className="w-full bg-transparent border border-line px-3 py-2 text-sm outline-none focus:border-volt"
          />
          <p className="text-xs text-slate mt-1">
            Upload your photo anywhere (e.g. a chat app, imgur) and paste the link here.
          </p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 mt-1">
          <Button type="button" variant="dark" onClick={handleClose} className="flex-1">Cancel</Button>
          <Button type="submit" variant="primary" disabled={submitting} className="flex-1">
            {submitting ? 'Submitting…' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
