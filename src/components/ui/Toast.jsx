import { Check } from 'lucide-react'

export default function Toast({ message, visible }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 bg-ink border border-volt text-paper text-xs font-accent uppercase tracking-wide px-4 py-2.5 shadow-lg">
        <Check size={13} className="text-volt shrink-0" />
        {message}
      </div>
    </div>
  )
}
