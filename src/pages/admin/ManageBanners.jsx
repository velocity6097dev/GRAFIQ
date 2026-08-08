import { useState } from 'react'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

const emptyForm = {
  eyebrow: '',
  titleLine1: '',
  titleHighlight1: '',
  titleLine2: '',
  titleHighlight2: '',
  subtitle: '',
  image: '',
  ctaPrimaryLabel: 'Shop Now',
  ctaPrimaryLink: '/shop',
  ctaSecondaryLabel: '',
  ctaSecondaryLink: ''
}

export default function ManageBanners() {
  const { banners, addBanner, updateBanner, deleteBanner, reorderBanner } = useStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const inputClass =
    'w-full bg-transparent border border-paper/25 focus:border-volt outline-none px-3 py-2 text-sm'

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (b) => {
    setEditingId(b.id)
    setForm({
      eyebrow: b.eyebrow || '',
      titleLine1: b.titleLine1 || '',
      titleHighlight1: b.titleHighlight1 || '',
      titleLine2: b.titleLine2 || '',
      titleHighlight2: b.titleHighlight2 || '',
      subtitle: b.subtitle || '',
      image: b.image || '',
      ctaPrimaryLabel: b.ctaPrimary?.label || '',
      ctaPrimaryLink: b.ctaPrimary?.link || '',
      ctaSecondaryLabel: b.ctaSecondary?.label || '',
      ctaSecondaryLink: b.ctaSecondary?.link || ''
    })
    setModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      eyebrow: form.eyebrow,
      titleLine1: form.titleLine1,
      titleHighlight1: form.titleHighlight1,
      titleLine2: form.titleLine2,
      titleHighlight2: form.titleHighlight2,
      subtitle: form.subtitle,
      image: form.image,
      ctaPrimary: form.ctaPrimaryLabel ? { label: form.ctaPrimaryLabel, link: form.ctaPrimaryLink } : null,
      ctaSecondary: form.ctaSecondaryLabel ? { label: form.ctaSecondaryLabel, link: form.ctaSecondaryLink } : null
    }
    if (editingId) updateBanner(editingId, payload)
    else addBanner(payload)
    setModalOpen(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase">Hero Banners</h1>
          <p className="text-slate text-sm mt-1">Controls the homepage carousel — order, launches & offers.</p>
        </div>
        <Button variant="primary" onClick={openAdd}>
          <Plus size={16} /> Add Banner
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {banners.map((b, i) => (
          <div key={b.id} className="border border-line flex items-center gap-4 p-3">
            <img src={b.image} alt="" className="w-24 h-16 object-cover bg-ink shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-accent uppercase tracking-wide truncate">
                {b.titleLine1} {b.titleHighlight1}
              </p>
              <p className="text-xs text-slate truncate">{b.subtitle}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => reorderBanner(b.id, 'up')}
                disabled={i === 0}
                className="p-1.5 disabled:opacity-30 hover:text-volt"
                aria-label="Move up"
              >
                <ArrowUp size={15} />
              </button>
              <button
                onClick={() => reorderBanner(b.id, 'down')}
                disabled={i === banners.length - 1}
                className="p-1.5 disabled:opacity-30 hover:text-volt"
                aria-label="Move down"
              >
                <ArrowDown size={15} />
              </button>
              <button
                onClick={() => updateBanner(b.id, { active: !b.active })}
                className="p-1.5 hover:text-volt"
                aria-label={b.active ? 'Hide banner' : 'Show banner'}
              >
                {b.active ? <Eye size={15} /> : <EyeOff size={15} className="text-slate" />}
              </button>
              <button onClick={() => openEdit(b)} className="p-1.5 hover:text-volt" aria-label="Edit banner">
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setConfirmDeleteId(b.id)}
                className="p-1.5 hover:text-red-400"
                aria-label="Delete banner"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Banner' : 'Add Banner'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input className={`${inputClass} sm:col-span-2`} placeholder="Eyebrow text"
            value={form.eyebrow} onChange={(e) => setForm({ ...form, eyebrow: e.target.value })} />
          <input className={inputClass} placeholder="Title line 1"
            value={form.titleLine1} onChange={(e) => setForm({ ...form, titleLine1: e.target.value })} />
          <input className={inputClass} placeholder="Title highlight 1 (lime colour)"
            value={form.titleHighlight1} onChange={(e) => setForm({ ...form, titleHighlight1: e.target.value })} />
          <input className={inputClass} placeholder="Title line 2 (optional)"
            value={form.titleLine2} onChange={(e) => setForm({ ...form, titleLine2: e.target.value })} />
          <input className={inputClass} placeholder="Title highlight 2 (optional)"
            value={form.titleHighlight2} onChange={(e) => setForm({ ...form, titleHighlight2: e.target.value })} />
          <input className={`${inputClass} sm:col-span-2`} placeholder="Subtitle"
            value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
          <input className={`${inputClass} sm:col-span-2`} placeholder="Image URL"
            value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} required />
          <input className={inputClass} placeholder="Primary button label"
            value={form.ctaPrimaryLabel} onChange={(e) => setForm({ ...form, ctaPrimaryLabel: e.target.value })} />
          <input className={inputClass} placeholder="Primary button link (e.g. /shop)"
            value={form.ctaPrimaryLink} onChange={(e) => setForm({ ...form, ctaPrimaryLink: e.target.value })} />
          <input className={inputClass} placeholder="Secondary link label (optional)"
            value={form.ctaSecondaryLabel} onChange={(e) => setForm({ ...form, ctaSecondaryLabel: e.target.value })} />
          <input className={inputClass} placeholder="Secondary link URL (optional)"
            value={form.ctaSecondaryLink} onChange={(e) => setForm({ ...form, ctaSecondaryLink: e.target.value })} />
          <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
            <Button type="button" variant="dark" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editingId ? 'Save Changes' : 'Add Banner'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Delete Banner">
        <p className="text-slate mb-6 text-sm">This banner will be removed from the homepage carousel.</p>
        <div className="flex justify-end gap-3">
          <Button variant="dark" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              deleteBanner(confirmDeleteId)
              setConfirmDeleteId(null)
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
