'use client'

import { type HTMLMotionProps, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { createScaleVariants, type MotionConfig, useMotionConfig } from './use-motion-variants'

// Omit<...,'key'> нужен из-за конфликта версий @types/react между framer-motion и keystatic
interface ScaleInProps extends Omit<HTMLMotionProps<'div'>, 'key'>, MotionConfig {
  children: ReactNode
  /** Начальный масштаб */
  initialScale?: number
}

/**
 * Появление элемента с масштабированием
 */
export function ScaleIn({ children, delay, duration, initialScale = 0.9, once, ...props }: ScaleInProps) {
  const { viewport, transition } = useMotionConfig({ delay, duration, once })
  const variants = createScaleVariants(initialScale)

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
      transition={transition}
      {...props}
    >
      {children}
    </motion.div>
  )
}
