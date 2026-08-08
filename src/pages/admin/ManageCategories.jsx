import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '../../context/StoreContext'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

const emptyForm = { name: '', image: '', description: '' }

export default function ManageCategories() {
  const { categories, products, addCategory, updateCategory, deleteCategory } = useStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const inputClass =
    'w-full bg-transparent border border-line focus:border-volt outline-none px-3 py-2 text-sm'

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (c) => {
    setEditingId(c.id)
    setForm({ name: c.name, image: c.image, description: c.description || '' })
    setModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingId) updateCategory(editingId, form)
    else addCategory(form)
    setModalOpen(false)
  }

  const productCount = (catId) => products.filter((p) => p.categoryId === catId).length

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="font-display text-3xl uppercase">Categories</h1>
        <Button variant="primary" onClick={openAdd}>
          <Plus size={16} /> Add Category
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => (
          <div key={c.id} className="border border-line overflow-hidden">
            <div className="aspect-video bg-ink">
              <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-accent uppercase tracking-wide">{c.name}</p>
                <div className="flex gap-2">
                  <button onClick={() => openEdit(c)} aria-label="Edit category" className="hover:text-volt">
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(c.id)}
                    aria-label="Delete category"
                    className="hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate mt-1">{productCount(c.id)} products</p>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Edit Category' : 'Add Category'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            className={inputClass}
            placeholder="Category name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className={inputClass}
            placeholder="Image URL"
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
            required
          />
          <textarea
            className={`${inputClass} min-h-[70px]`}
            placeholder="Short description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex justify-end gap-3 mt-2">
            <Button type="button" variant="dark" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary">{editingId ? 'Save Changes' : 'Add Category'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title="Delete Category">
        <p className="text-slate mb-6 text-sm">
          Products in this category will become uncategorised rather than being deleted.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="dark" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              deleteCategory(confirmDeleteId)
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
