'use client'

import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import { memo, useEffect, useMemo, useRef } from 'react'

interface AnimatedCounterProps {
  /** Конечное значение */
  value: number
  /** Длительность анимации (сек) */
  duration?: number
  /** Суффикс (например, "+", "K") */
  suffix?: string
  /** Префикс (например, "$", "~") */
  prefix?: string
  /** CSS классы */
  className?: string
}

/**
 * Мемоизированные spring параметры для useSpring
 */
const SPRING_CONFIG = {
  damping: 50,
  stiffness: 100,
} as const

/**
 * Анимированный счётчик чисел
 * Мемоизирован для предотвращения лишних рендеров
 */
export const AnimatedCounter = memo(function AnimatedCounter({
  value,
  duration: _duration = 2,
  suffix = '',
  prefix = '',
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, SPRING_CONFIG)

  // Мемоизируем начальное значение для отображения
  const initialDisplay = useMemo(() => `${prefix}0${suffix}`, [prefix, suffix])

  useEffect(() => {
    if (isInView) {
      motionValue.set(value)
    }
  }, [isInView, motionValue, value])

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${Math.round(latest)}${suffix}`
      }
    })
    return unsubscribe
  }, [springValue, prefix, suffix])

  return (
    <motion.span ref={ref} className={className}>
      {initialDisplay}
    </motion.span>
  )
})
