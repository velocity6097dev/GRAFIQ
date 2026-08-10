const options = [
  { id: 'razorpay', label: 'Pay Online', desc: 'UPI, Cards, Netbanking & Wallets — via Razorpay' },
  { id: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives' }
]

// `codNote` (optional) is passed down by Checkout.jsx when
// settings.codAdvancePercent > 0 — it explains the non-refundable
// upfront advance required to confirm a COD order, right under the COD
// option itself instead of somewhere easy to miss.
export default function PaymentOptions({ selected, onSelect, codNote }) {
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
            {opt.id === 'cod' && codNote && (
              <p className="text-xs text-volt mt-1.5">{codNote}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  )
}
