import { motion } from 'framer-motion'

const variants = {
  primary: 'bg-volt text-ink hover:bg-white',
  dark: 'bg-ink text-paper border border-line hover:border-volt',
  outline: 'bg-transparent text-paper border border-paper hover:bg-paper hover:text-ink',
  ghost: 'bg-transparent text-paper hover:text-volt'
}

export default function Button({
  children,
  variant = 'primary',
  className = '',
  as: Component = 'button',
  ...props
}) {
  return (
    <motion.div whileTap={{ scale: 0.96 }} className="inline-block">
      <Component
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-accent text-sm tracking-wide uppercase transition-colors duration-200 ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </Component>
    </motion.div>
  )
}
