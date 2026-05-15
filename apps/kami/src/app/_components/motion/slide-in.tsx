'use client'

import { type HTMLMotionProps, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { createSlideVariants, type MotionConfig, type SlideDirection, useMotionConfig } from './use-motion-variants'

// Omit<...,'key'> нужен из-за конфликта версий @types/react между framer-motion и keystatic
interface SlideInProps extends Omit<HTMLMotionProps<'div'>, 'key'>, MotionConfig {
  children: ReactNode
  /** Направление появления */
  direction?: SlideDirection
  /** Смещение в пикселях */
  offset?: number
}

/**
 * Появление элемента со сдвигом
 */
export function SlideIn({ children, direction = 'up', delay, duration, offset = 50, once, ...props }: SlideInProps) {
  const { viewport, transition } = useMotionConfig({ delay, duration, once })
  const variants = createSlideVariants(direction, offset)

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
