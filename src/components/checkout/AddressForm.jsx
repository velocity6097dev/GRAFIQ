const fieldClass =
  'w-full bg-transparent border border-line focus:border-volt outline-none px-3 py-2.5 placeholder:text-slate'

export default function AddressForm({ address, onChange }) {
  const set = (key) => (e) => onChange({ ...address, [key]: e.target.value })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <input
        className={`${fieldClass} sm:col-span-2`}
        placeholder="Full name"
        value={address.name}
        onChange={set('name')}
        required
      />
      <input
        className={fieldClass}
        placeholder="Mobile number"
        value={address.phone}
        onChange={set('phone')}
        inputMode="numeric"
        maxLength={10}
        required
      />
      <input
        className={fieldClass}
        placeholder="Pincode"
        value={address.pincode}
        onChange={set('pincode')}
        inputMode="numeric"
        maxLength={6}
        required
      />
      <textarea
        className={`${fieldClass} sm:col-span-2 min-h-[80px]`}
        placeholder="House no., building, street, area"
        value={address.line1}
        onChange={set('line1')}
        required
      />
      <input
        className={fieldClass}
        placeholder="City"
        value={address.city}
        onChange={set('city')}
        required
      />
      <input
        className={fieldClass}
        placeholder="State"
        value={address.state}
        onChange={set('state')}
        required
      />
    </div>
  )
}
