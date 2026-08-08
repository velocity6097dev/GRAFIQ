import paintStrokeLime from '../../assets/brand/paint-stroke-lime.png'

const variants = {
  // no bg-volt here — the lime colour comes from the paint-stroke image
  // applied below, so the "primary" button reads as a brush-stroke mark
  // instead of a flat rectangle.
  primary: 'text-ink border-none hover:brightness-110 hover:saturate-150',
  dark: 'bg-ink text-paper border border-line hover:border-volt',
  outline: 'bg-transparent text-paper border border-paper hover:bg-paper hover:text-ink',
  ghost: 'bg-transparent text-paper hover:text-volt'
}

const sizes = {
  md: 'px-7 py-3.5 text-sm',
  lg: 'px-10 py-5 text-base'
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
  style,
  ...props
}) {
  const isPrimary = variant === 'primary'

  return (
    <Component
      className={`inline-flex items-center justify-center gap-2 font-accent tracking-wide uppercase transition-all duration-200 active:scale-95 ${sizes[size]} ${variants[variant]} ${className}`}
      style={
        isPrimary
          ? {
              backgroundImage: `url(${paintStrokeLime})`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              ...style
            }
          : style
      }
      {...props}
    >
      {children}
    </Component>
  )
}
