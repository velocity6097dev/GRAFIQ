const tones = {
  volt: 'bg-volt text-ink',
  dark: 'bg-ink text-paper border border-line',
  outline: 'bg-transparent text-paper border border-paper'
}

export default function Badge({ children, tone = 'volt', className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-[11px] font-accent tracking-wider uppercase ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
