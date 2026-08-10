import { ChevronLeft, ChevronRight } from 'lucide-react'

// Shows up to 5 page numbers around the current page, with first/last
// always visible and "…" gaps in between for larger page counts.
function getPageList(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)

  const withGaps = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) withGaps.push('…')
    withGaps.push(p)
  })
  return withGaps
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const pages = getPageList(page, totalPages)

  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-9 h-9 flex items-center justify-center border border-line disabled:opacity-30 hover:border-volt disabled:hover:border-line"
        aria-label="Previous page"
      >
        <ChevronLeft size={15} />
      </button>

      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="w-9 h-9 flex items-center justify-center text-slate text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-9 h-9 flex items-center justify-center text-sm font-accent border ${
              p === page ? 'border-volt text-volt' : 'border-line hover:border-slate'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="w-9 h-9 flex items-center justify-center border border-line disabled:opacity-30 hover:border-volt disabled:hover:border-line"
        aria-label="Next page"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  )
}
