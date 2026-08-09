import { useState } from 'react'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import { formatPrice } from '../../utils/format'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

const emptyForm = {
  name: '',
  categoryId: '',
  price: '',
  discount: '',
  stock: '',
  colors: '',
  sizes: '',
  images: '',
  tags: [],
  description: ''
}

export default function ManageProducts() {
  const { products, categories, addProduct, updateProduct, deleteProduct, settings } = useStore()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
    setModalOpen(true)
  }

  const openEdit = (p) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      categoryId: p.categoryId || '',
      price: p.price,
      discount: p.discount || 0,
      stock: p.stock,
      colors: (p.colors || []).join(', '),
      sizes: (p.sizes || []).join(', '),
      images: (p.images || []).join(', '),
      tags: p.tags || [],
      description: p.description || ''
    })
    setFormError('')
    setModalOpen(true)
  }

  const toggleTag = (tag) =>
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag]
    }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: form.name,
      categoryId: form.categoryId || null,
      price: Number(form.price) || 0,
      discount: Number(form.discount) || 0,
      stock: Number(form.stock) || 0,
      colors: form.colors.split(',').map((s) => s.trim()).filter(Boolean),
      sizes: form.sizes.split(',').map((s) => s.trim()).filter(Boolean),
      images: form.images.split(',').map((s) => s.trim()).filter(Boolean),
      tags: form.tags,
      description: form.description,
      rating: 4.5,
      reviews: 0
    }
    setSaving(true)
    setFormError('')
    try {
      if (editingId) await updateProduct(editingId, payload)
      else await addProduct(payload)
      setModalOpen(false)
    } catch (err) {
      setFormError(err.message || 'Could not save the product.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full bg-transparent border border-paper/25 focus:border-volt outline-none px-3 py-2 text-sm'

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="font-display text-3xl uppercase">Products</h1>
        <Button variant="primary" onClick={openAdd}>
          <Plus size={16} /> Add Product
        </Button>
      </div>

      <div className="flex items-center gap-2 border border-line px-3 py-2 mb-6 max-w-sm">
        <Search size={16} className="text-slate" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="bg-transparent outline-none flex-1 text-sm"
        />
      </div>

      <div className="border border-line overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="border-b border-line text-left text-slate font-accent uppercase text-xs">
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Discount</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Tags</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const category = categories.find((c) => c.id === p.categoryId)
              return (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="p-3 flex items-center gap-3">
                    <img src={p.images?.[0]} alt="" className="w-10 h-12 object-cover bg-ink" />
                    <span className="font-accent">{p.name}</span>
                  </td>
                  <td className="p-3 text-slate">{category?.name || 'Uncategorised'}</td>
                  <td className="p-3">{formatPrice(p.price, settings.currencySymbol)}</td>
                  <td className="p-3">{p.discount > 0 ? `${p.discount}%` : '—'}</td>
                  <td className={`p-3 ${p.stock <= 10 ? 'text-volt' : ''}`}>{p.stock}</td>
                  <td className="p-3 text-slate capitalize">{(p.tags || []).join(', ') || '—'}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(p)} aria-label="Edit product" className="p-1.5 hover:text-volt">
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        aria-label="Delete product"
                        className="p-1.5 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Product' : 'Add Product'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            className={`${inputClass} sm:col-span-2`}
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <select
            className={inputClass}
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="" style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>Uncategorised</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className={inputClass}
            placeholder="Price (₹)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          <input
            type="number"
            className={inputClass}
            placeholder="Discount %"
            value={form.discount}
            onChange={(e) => setForm({ ...form, discount: e.target.value })}
            min="0"
            max="90"
          />
          <input
            type="number"
            className={inputClass}
            placeholder="Stock quantity"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="Colours (comma separated)"
            value={form.colors}
            onChange={(e) => setForm({ ...form, colors: e.target.value })}
          />
          <input
            className={`${inputClass} sm:col-span-2`}
            placeholder="Sizes (comma separated, e.g. S, M, L, XL)"
            value={form.sizes}
            onChange={(e) => setForm({ ...form, sizes: e.target.value })}
          />
          <textarea
            className={`${inputClass} sm:col-span-2 min-h-[70px]`}
            placeholder="Image URLs (comma separated)"
            value={form.images}
            onChange={(e) => setForm({ ...form, images: e.target.value })}
          />
          <textarea
            className={`${inputClass} sm:col-span-2 min-h-[70px]`}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="sm:col-span-2 flex gap-4">
            {['new', 'bestseller'].map((tag) => (
              <label key={tag} className="flex items-center gap-2 text-sm capitalize">
                <input
                  type="checkbox"
                  className="accent-[#CAD600]"
                  checked={form.tags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                />
                {tag}
              </label>
            ))}
          </div>
          {formError && <p className="sm:col-span-2 text-red-400 text-xs">{formError}</p>}
          <div className="sm:col-span-2 flex justify-end gap-3 mt-2">
            <Button type="button" variant="dark" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Product'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Delete Product"
      >
        <p className="text-slate mb-6 text-sm">
          This will permanently remove the product from your store. This can't be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="dark" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={async () => {
              try {
                await deleteProduct(confirmDeleteId)
              } catch (err) {
                setFormError(err.message || 'Could not delete the product.')
              } finally {
                setConfirmDeleteId(null)
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  )
}
