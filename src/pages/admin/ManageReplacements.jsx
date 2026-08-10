import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { REPLACEMENT_TIMELINE_STEPS } from '../../utils/orderTimeline'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

const STATUSES = [...REPLACEMENT_TIMELINE_STEPS.map((s) => s.status), 'Rejected']

const statusTone = {
  'Replacement Requested': 'text-slate',
  'Under Review': 'text-volt',
  Approved: 'text-volt',
  'Replacement Processing': 'text-volt',
  'Replacement Shipped': 'text-volt',
  'Out for Delivery': 'text-volt',
  'Replacement Delivered': 'text-green-400',
  Rejected: 'text-red-400'
}

const inputClass = 'w-full bg-transparent border border-paper/25 focus:border-volt outline-none px-3 py-2 text-sm'

export default function ManageReplacements() {
  const { replacements, orders, updateReplacement } = useStore()
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const filtered = useMemo(
    () => (filter === 'all' ? replacements : replacements.filter((r) => r.status === filter)),
    [replacements, filter]
  )

  const openEdit = (r) => {
    setEditing(r)
    setForm({
      status: r.status,
      courierName: r.courierName || '',
      trackingId: r.trackingId || '',
      estimatedDelivery: r.estimatedDelivery || ''
    })
    setError('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await updateReplacement(editing.id, form)
      setEditing(null)
    } catch (err) {
      setError(err.message || 'Could not save this replacement request.')
    } finally {
      setSaving(false)
    }
  }

  const orderFor = (orderId) => orders.find((o) => o.id === orderId)

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase">Replacements</h1>
          <p className="text-slate text-sm mt-1">{replacements.length} total requests</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-panel border border-line px-3 py-2 text-sm font-accent uppercase outline-none"
        >
          <option value="all" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s} style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate text-sm">No replacement requests match this filter.</p>
      ) : (
        <div className="border border-line overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-line text-left text-slate font-accent uppercase text-xs">
                <th className="p-3">Request ID</th>
                <th className="p-3">Order</th>
                <th className="p-3">Item</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const order = orderFor(r.orderId)
                return (
                  <tr key={r.id} className="border-b border-line last:border-0">
                    <td className="p-3 font-accent text-volt">{r.id}</td>
                    <td className="p-3">
                      <span className="text-paper">{r.orderId}</span>
                      {order && <p className="text-xs text-slate">{order.address?.name}</p>}
                    </td>
                    <td className="p-3">{r.productName}</td>
                    <td className="p-3 text-slate">{r.reason}</td>
                    <td className="p-3 text-slate">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className={`p-3 font-accent uppercase text-xs ${statusTone[r.status] || 'text-slate'}`}>
                      {r.status}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => openEdit(r)}
                        className="inline-flex items-center gap-1 text-xs font-accent uppercase tracking-wide text-paper hover:text-volt"
                      >
                        <RefreshCw size={13} /> Manage
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Replacement ${editing.id}` : ''}>
        {editing && (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="border border-line p-3 text-sm text-slate">
              <p className="text-paper">{editing.productName}</p>
              <p className="mt-1">Reason: {editing.reason}</p>
              {editing.note && <p className="mt-1">Note: {editing.note}</p>}
              {editing.photoUrl && (
                <a href={editing.photoUrl} target="_blank" rel="noreferrer" className="text-volt underline mt-1 inline-block">
                  View attached photo
                </a>
              )}
            </div>

            <div>
              <label className="text-xs font-accent uppercase text-slate mb-1.5 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s} style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>{s}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input
                className={inputClass}
                placeholder="Courier name"
                value={form.courierName}
                onChange={(e) => setForm({ ...form, courierName: e.target.value })}
              />
              <input
                className={inputClass}
                placeholder="Tracking ID"
                value={form.trackingId}
                onChange={(e) => setForm({ ...form, trackingId: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-accent uppercase text-slate mb-1.5 block">Estimated Delivery</label>
              <input
                type="date"
                className={inputClass}
                value={form.estimatedDelivery || ''}
                onChange={(e) => setForm({ ...form, estimatedDelivery: e.target.value })}
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex justify-end gap-3 mt-2">
              <Button type="button" variant="dark" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
