'use client'

/**
 * PageTransition — плавные переходы между страницами
 *
 * Использует Framer Motion для анимации входа/выхода страниц.
 * Оборачивает children и анимирует при смене pathname.
 */

import { AnimatePresence, motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
}

/** Варианты анимации */
const variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
}

/** Настройки transition */
const transition = {
  duration: 0.15,
  ease: [0, 0, 0.2, 1] as const, // easeOut cubic-bezier
}

/**
 * Компонент для плавных переходов между страницами
 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={transition}
        style={{ height: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
