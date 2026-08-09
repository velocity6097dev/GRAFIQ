// Matches the lime/white rotating semicircle design from circle_loader.html.
// Since only width/height change (not the viewBox), the stroke proportions
// scale correctly at any size — same component works as a full-page loader
// or a tiny inline spinner.
export default function CircleLoader({ size = 64, className = '' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`animate-[spin_2s_linear_infinite] ${className}`}
      role="status"
      aria-label="Loading"
    >
      <circle
        cx="100"
        cy="100"
        r="82"
        fill="none"
        stroke="#cad600"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="210 300"
      />
      <circle
        cx="100"
        cy="100"
        r="82"
        fill="none"
        stroke="#fff"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="210 300"
        transform="rotate(180 100 100)"
      />
    </svg>
  )
}
