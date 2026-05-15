'use client'

import { type HTMLMotionProps, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { createStaggerContainerVariants, createStaggerItemVariants, useMotionConfig } from './use-motion-variants'

// Omit<...,'key'> нужен из-за конфликта версий @types/react между framer-motion и keystatic
interface StaggerContainerProps extends Omit<HTMLMotionProps<'div'>, 'key'> {
  children: ReactNode
  /** Задержка между элементами (сек) */
  staggerDelay?: number
  /** Задержка перед началом (сек) */
  delay?: number
  /** Анимировать при появлении в viewport */
  once?: boolean
}

/**
 * Контейнер для staggered анимаций
 */
export function StaggerContainer({ children, staggerDelay = 0.1, delay = 0, once, ...props }: StaggerContainerProps) {
  const { viewport } = useMotionConfig({ once })
  const variants = createStaggerContainerVariants(staggerDelay, delay)

  return (
    <motion.div initial="hidden" whileInView="visible" viewport={viewport} variants={variants} {...props}>
      {children}
    </motion.div>
  )
}

interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'key'> {
  children: ReactNode
  /** Длительность анимации (сек) */
  duration?: number
}

/**
 * Элемент для staggered анимации (использовать внутри StaggerContainer)
 */
export function StaggerItem({ children, duration, ...props }: StaggerItemProps) {
  const variants = createStaggerItemVariants(duration)

  return (
    <motion.div variants={variants} {...props}>
      {children}
    </motion.div>
  )
}
