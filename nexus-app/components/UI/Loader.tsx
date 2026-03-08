'use client'

import { motion } from 'framer-motion'

export default function Loader() {
  return (
    <div className="flex items-center justify-center p-8">
      <motion.div
        className="flex space-x-2"
        initial="hidden"
        animate="visible"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-3 h-3 bg-primary-500 rounded-full"
            variants={{
              hidden: { opacity: 0, y: 0 },
              visible: {
                opacity: 1,
                y: [0, -10, 0],
                transition: {
                  duration: 0.6,
                  repeat: Infinity,
                  delay: i * 0.2,
                },
              },
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}
