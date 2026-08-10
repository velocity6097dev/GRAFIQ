import { useEffect, useState } from 'react'
import { useStore } from '../../context/StoreContext'
import Button from '../../components/ui/Button'

const inputClass =
  'w-full bg-transparent border border-paper/25 focus:border-volt outline-none px-3 py-2 text-sm'

export default function Settings() {
  const { settings, updateSettings } = useStore()
  const [form, setForm] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // `settings` arrives from the database a beat after first render (and
  // again after any save elsewhere), so keep the form in sync with it
  // rather than only reading it once via useState's initial value.
  useEffect(() => {
    setForm(settings)
  }, [settings])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleFeatureChange = (id, key, value) =>
    setForm({
      ...form,
      features: form.features.map((f) => (f.id === id ? { ...f, [key]: value } : f))
    })

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await updateSettings({
        ...form,
        deliveryFee: Number(form.deliveryFee),
        freeDeliveryAbove: Number(form.freeDeliveryAbove),
        codAdvancePercent: Number(form.codAdvancePercent) || 0
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err.message || 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl uppercase mb-8">Store Settings</h1>

      <form onSubmit={handleSave} className="flex flex-col gap-10">
        <section>
          <p className="font-accent uppercase tracking-wide text-volt mb-4">Store Info</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <input className={inputClass} placeholder="Store name" value={form.storeName} onChange={set('storeName')} />
            <input
              className={`${inputClass} opacity-50 cursor-not-allowed`}
              value="₹  (fixed — India-only store)"
              disabled
              title="Currency is fixed to ₹ across the site and isn't editable."
            />
            <input className={`${inputClass} sm:col-span-2`} placeholder="Tagline" value={form.tagline} onChange={set('tagline')} />
            <input className={`${inputClass} sm:col-span-2`} placeholder="Footer ticker text" value={form.tickerText} onChange={set('tickerText')} />
          </div>
        </section>

        <section>
          <p className="font-accent uppercase tracking-wide text-volt mb-4">Contact & Social</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <input className={inputClass} placeholder="Contact email" value={form.contactEmail} onChange={set('contactEmail')} />
            <input className={inputClass} placeholder="Contact phone" value={form.contactPhone} onChange={set('contactPhone')} />
            <input className={inputClass} placeholder="Instagram URL" value={form.instagram} onChange={set('instagram')} />
            <input className={inputClass} placeholder="Facebook URL" value={form.facebook} onChange={set('facebook')} />
            <input className={inputClass} placeholder="Twitter/X URL" value={form.twitter} onChange={set('twitter')} />
          </div>
        </section>

        <section>
          <p className="font-accent uppercase tracking-wide text-volt mb-4">Delivery</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate uppercase font-accent">Delivery Fee (₹)</label>
              <input type="number" className={`${inputClass} mt-1.5`} value={form.deliveryFee} onChange={set('deliveryFee')} />
            </div>
            <div>
              <label className="text-xs text-slate uppercase font-accent">Free Delivery Above (₹)</label>
              <input type="number" className={`${inputClass} mt-1.5`} value={form.freeDeliveryAbove} onChange={set('freeDeliveryAbove')} />
            </div>
          </div>
        </section>

        <section>
          <p className="font-accent uppercase tracking-wide text-volt mb-4">Cash on Delivery</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate uppercase font-accent">COD Advance (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                className={`${inputClass} mt-1.5`}
                value={form.codAdvancePercent ?? 0}
                onChange={set('codAdvancePercent')}
              />
            </div>
          </div>
          <p className="text-xs text-slate mt-2 leading-relaxed">
            If set above 0, a customer choosing Cash on Delivery must pay this % of the order total online
            (via Razorpay) before it ships — the rest stays payable in cash on delivery. This advance is
            non-refundable if the order is cancelled; any refund of it (e.g. minus shipping charges) is done
            manually from the order's Payment section. Leave at 0 for COD to work as before, fully paid on
            delivery.
          </p>
        </section>

        <section>
          <p className="font-accent uppercase tracking-wide text-volt mb-4">Feature Strip</p>
          <div className="flex flex-col gap-3">
            {form.features.map((f) => (
              <div key={f.id} className="grid sm:grid-cols-2 gap-3 border border-line p-3">
                <input
                  className={inputClass}
                  placeholder="Title"
                  value={f.title}
                  onChange={(e) => handleFeatureChange(f.id, 'title', e.target.value)}
                />
                <input
                  className={inputClass}
                  placeholder="Description"
                  value={f.desc}
                  onChange={(e) => handleFeatureChange(f.id, 'desc', e.target.value)}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-4">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </Button>
          {saved && <span className="text-volt text-sm">Saved ✓</span>}
          {error && <span className="text-red-400 text-sm">{error}</span>}
        </div>
      </form>
    </div>
  )
}
