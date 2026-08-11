import { Copy } from 'lucide-react'
import { copyToClipboard } from '../../utils/clipboard'

// `getText` can be a string or a function returning one — a function is
// preferred so the text is built fresh at click time (from current order
// state) rather than possibly-stale text computed at render time.
export default function CopyButton({ getText, label = 'Copy All', onCopied, iconOnly = false, className = '' }) {
  const handleClick = async (e) => {
    e.stopPropagation()
    const text = typeof getText === 'function' ? getText() : getText
    if (!text) return
    try {
      await copyToClipboard(text)
      onCopied?.()
    } catch {
      // Clipboard access blocked (permissions / insecure context) — this
      // is just a convenience action, so fail quietly rather than
      // showing an error state for something this low-stakes.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={`flex items-center gap-1 text-slate hover:text-volt transition-colors shrink-0 ${
        iconOnly ? '' : 'text-[11px] font-accent uppercase tracking-wide'
      } ${className}`}
    >
      <Copy size={iconOnly ? 13 : 11} />
      {!iconOnly && <span>{label}</span>}
    </button>
  )
}
