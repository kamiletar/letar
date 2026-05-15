'use client'

import { motion } from 'framer-motion'
import type { PropsWithChildren } from 'react'

/**
 * Варианты анимации для страницы
 */
const pageVariants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
} as const

/**
 * Компонент для плавных переходов между страницами
 */
export function PageTransition({ children }: PropsWithChildren) {
  return (
    <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants}>
      {children}
    </motion.div>
  )
}
