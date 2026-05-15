'use client'

import { type HTMLMotionProps, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { createFadeVariants, type MotionConfig, useMotionConfig } from './use-motion-variants'

// Omit<...,'key'> нужен из-за конфликта версий @types/react между framer-motion и keystatic
interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'key'>, MotionConfig {
  children: ReactNode
}

/**
 * Плавное появление элемента
 */
export function FadeIn({ children, delay, duration, once, ...props }: FadeInProps) {
  const { viewport, transition } = useMotionConfig({ delay, duration, once })
  const variants = createFadeVariants()

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
