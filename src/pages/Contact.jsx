import { useState } from 'react'
import { Mail, Phone } from 'lucide-react'
import { useStore } from '../context/StoreContext'
import Button from '../components/ui/Button'

const baseField =
  'w-full bg-transparent border focus:border-volt outline-none px-3 py-2.5 placeholder:text-slate'

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Name is required.'
  if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email address.'
  if (!form.message.trim()) errors.message = 'Message is required.'
  return errors
}

export default function Contact() {
  const { settings } = useStore()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationErrors = validate(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    // TODO(production): send this to your support inbox / helpdesk API.
    setErrors({})
    setSent(true)
    setForm({ name: '', email: '', message: '' })
  }

  const cls = (key) => `${baseField} ${errors[key] ? 'border-red-500' : 'border-paper/25'}`

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-16 grid md:grid-cols-2 gap-12">
      <div>
        <p className="font-accent text-volt tracking-widest text-sm mb-2 uppercase">Get in touch</p>
        <h1 className="font-display text-4xl uppercase mb-6">Contact Us</h1>
        <p className="text-slate mb-8">
          Questions about an order, a custom print, or a bulk request? Send us a message —
          we usually reply within a few hours.
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Mail size={18} className="text-volt" />
            <span>{settings.contactEmail}</span>
          </div>
          <div className="flex items-center gap-3">
            <Phone size={18} className="text-volt" />
            <span>{settings.contactPhone}</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <input
            className={cls('name')}
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {errors.name && <p className="text-red-400 text-xs mt-1.5">{errors.name}</p>}
        </div>
        <div>
          <input
            type="email"
            className={cls('email')}
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {errors.email && <p className="text-red-400 text-xs mt-1.5">{errors.email}</p>}
        </div>
        <div>
          <textarea
            className={`${cls('message')} min-h-[140px]`}
            placeholder="Your message"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          {errors.message && <p className="text-red-400 text-xs mt-1.5">{errors.message}</p>}
        </div>
        <Button type="submit" variant="primary">{sent ? 'Message Sent ✓' : 'Send Message'}</Button>
      </form>
    </div>
  )
}
