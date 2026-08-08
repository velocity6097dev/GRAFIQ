const variants = {
  primary: 'bg-volt text-ink hover:bg-white',
  dark: 'bg-ink text-paper border border-line hover:border-volt',
  outline: 'bg-transparent text-paper border border-paper hover:bg-paper hover:text-ink',
  ghost: 'bg-transparent text-paper hover:text-volt'
}

const sizes = {
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base'
}

// NOTE: this used to wrap the button in a separate `motion.div` (for the
// tap-scale effect), but an `inline-block` wrapper around an element with
// `w-full` silently breaks the width (the wrapper shrinks to content, so
// `w-full` had nothing to be 100% of). That's why "Checkout" and a few
// other full-width buttons rendered small/left-aligned instead of full
// width. Animating the element itself with a plain CSS active-state avoids
// the extra wrapper entirely and fixes the sizing.
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  as: Component = 'button',
  ...props
}) {
  return (
    <Component
      className={`inline-flex items-center justify-center gap-2 font-accent tracking-wide uppercase transition-all duration-200 active:scale-95 ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
}
