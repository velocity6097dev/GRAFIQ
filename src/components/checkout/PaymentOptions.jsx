const options = [
  { id: 'razorpay', label: 'Pay Online', desc: 'UPI, Cards, Netbanking & Wallets — via Razorpay' },
  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives' }
]

export default function PaymentOptions({ selected, onSelect }) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((opt) => (
        <label
          key={opt.id}
          className={`flex items-start gap-3 border p-4 cursor-pointer transition-colors ${
            selected === opt.id ? 'border-volt bg-panel' : 'border-line hover:border-slate'
          }`}
        >
          <input
            type="radio"
            name="payment"
            className="mt-1 accent-[#CAD600]"
            checked={selected === opt.id}
            onChange={() => onSelect(opt.id)}
          />
          <div>
            <p className="font-accent tracking-wide uppercase text-sm">{opt.label}</p>
            <p className="text-xs text-slate">{opt.desc}</p>
          </div>
        </label>
      ))}
    </div>
  )
}
