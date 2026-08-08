import { motion } from 'framer-motion'

export default function SectionHeading({ eyebrow, title, highlight, action }) {
  return (
    <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        {eyebrow && (
          <p className="font-accent text-volt tracking-widest text-sm mb-1">{eyebrow}</p>
        )}
        <h2 className="font-display text-3xl md:text-4xl uppercase leading-none">
          {title} {highlight && <span className="text-volt">{highlight}</span>}
        </h2>
      </motion.div>
      {action}
    </div>
  )
}
