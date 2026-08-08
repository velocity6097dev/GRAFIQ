const baseField =
  'w-full bg-transparent border focus:border-volt outline-none px-3 py-2.5 placeholder:text-slate'

// Renders one field + its red error message (if any). This form isn't
// wrapped in an actual <form> element (it lives inside the checkout
// sidebar layout, not a submittable form), so the `required` attribute on
// its own does nothing — the browser only runs that check on a real form
// submission event. `errors` is computed and passed down by Checkout.jsx
// after a Pay Now click, so a genuinely empty field turns red with a
// message instead of just quietly disabling the button.
function Field({ className = '', error, children }) {
  return (
    <div className={className}>
      {children}
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
    </div>
  )
}

export default function AddressForm({ address, onChange, errors = {} }) {
  const set = (key) => (e) => onChange({ ...address, [key]: e.target.value })
  const cls = (key) =>
    `${baseField} ${errors[key] ? 'border-red-500' : 'border-paper/25'}`

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field className="sm:col-span-2" error={errors.name}>
        <input
          className={cls('name')}
          placeholder="Full name"
          value={address.name}
          onChange={set('name')}
        />
      </Field>

      <Field error={errors.phone}>
        <input
          className={cls('phone')}
          placeholder="Mobile number"
          value={address.phone}
          onChange={set('phone')}
          inputMode="numeric"
          maxLength={10}
        />
      </Field>

      <Field error={errors.pincode}>
        <input
          className={cls('pincode')}
          placeholder="Pincode"
          value={address.pincode}
          onChange={set('pincode')}
          inputMode="numeric"
          maxLength={6}
        />
      </Field>

      <Field className="sm:col-span-2" error={errors.line1}>
        <textarea
          className={`${cls('line1')} min-h-[80px]`}
          placeholder="House no., building, street, area"
          value={address.line1}
          onChange={set('line1')}
        />
      </Field>

      <Field error={errors.city}>
        <input
          className={cls('city')}
          placeholder="City"
          value={address.city}
          onChange={set('city')}
        />
      </Field>

      <Field error={errors.state}>
        <input
          className={cls('state')}
          placeholder="State"
          value={address.state}
          onChange={set('state')}
        />
      </Field>
    </div>
  )
}
