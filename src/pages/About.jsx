import { motion } from 'framer-motion'
import { useStore } from '../context/StoreContext'

export default function About() {
  const { settings } = useStore()

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="font-accent text-volt tracking-widest text-sm mb-2 uppercase">Our Story</p>
        <h1 className="font-display text-4xl md:text-5xl uppercase mb-6">
          Not Just Clothes. <span className="text-volt">It's Your Identity.</span>
        </h1>
        <div className="text-slate leading-relaxed flex flex-col gap-4">
          <p>
            {settings.storeName} started as a two-person print shop with one belief: clothing
            should say something. Every drop is designed in-house, printed on heavyweight
            cotton, and made to survive more washes than your average tee.
          </p>
          <p>
            We're not chasing trends — we're chasing self-expression. If you can imagine it,
            our Design Your Own studio lets you print it, wear it, and own it.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-10">
          <div className="border border-line p-6 text-center">
            <p className="font-display text-3xl text-volt">50K+</p>
            <p className="text-xs text-slate mt-1 uppercase font-accent">Tees Printed</p>
          </div>
          <div className="border border-line p-6 text-center">
            <p className="font-display text-3xl text-volt">4.6★</p>
            <p className="text-xs text-slate mt-1 uppercase font-accent">Average Rating</p>
          </div>
          <div className="border border-line p-6 text-center">
            <p className="font-display text-3xl text-volt">24h</p>
            <p className="text-xs text-slate mt-1 uppercase font-accent">Order Processing</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
