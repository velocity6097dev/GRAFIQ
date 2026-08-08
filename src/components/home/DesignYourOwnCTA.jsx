import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Button from '../ui/Button'

export default function DesignYourOwnCTA() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 mb-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative border border-line bg-panel grid md:grid-cols-2 items-center overflow-hidden"
      >
        <div className="p-8 md:p-14">
          <p className="font-accent text-volt tracking-widest text-sm mb-2">Your idea. Our creation.</p>
          <h2 className="font-display text-3xl md:text-5xl uppercase leading-none mb-4">
            Design <span className="text-volt">Your Own</span>
          </h2>
          <p className="text-slate max-w-sm mb-6">
            Upload your artwork, pick the base, the colour, the placement — we print it and ship it.
            No design skills needed.
          </p>
          <Button as={Link} to="/design-your-own" variant="primary">
            Start Designing <ArrowRight size={16} />
          </Button>
        </div>
        <div className="relative h-64 md:h-full">
          <img
            src="https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=900&q=80"
            alt="Blank t-shirt canvas ready for custom print"
            className="w-full h-full object-cover"
          />
        </div>
      </motion.div>
    </section>
  )
}
