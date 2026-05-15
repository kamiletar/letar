'use client'

import { motion, useInView, type Variants } from 'framer-motion'
import { type ReactNode, useRef } from 'react'

interface FadeInSectionProps {
  /** Контент секции */
  children: ReactNode
  /** Направление появления */
  direction?: 'up' | 'down' | 'left' | 'right'
  /** Задержка анимации в секундах */
  delay?: number
  /** Длительность анимации в секундах */
  duration?: number
  /** Анимировать только один раз */
  once?: boolean
  /** Дополнительные стили Box */
  className?: string
}

/**
 * Секция с эффектом fade-in при появлении в viewport.
 * Поддерживает анимацию с разных направлений.
 */
export function FadeInSection({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  once = true,
  className,
}: FadeInSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once, margin: '-100px' })

  // Начальные позиции в зависимости от направления
  const getOffset = () => {
    switch (direction) {
      case 'up':
        return { y: 40, x: 0 }
      case 'down':
        return { y: -40, x: 0 }
      case 'left':
        return { y: 0, x: 40 }
      case 'right':
        return { y: 0, x: -40 }
      default:
        return { y: 40, x: 0 }
    }
  }

  const offset = getOffset()

  const variants: Variants = {
    hidden: {
      opacity: 0,
      ...offset,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  )
}
