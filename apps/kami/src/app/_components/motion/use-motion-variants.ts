'use client'

import { MOTION_DEFAULTS } from '@/lib/utils/constants'
import type { Easing, Transition, Variants } from 'framer-motion'

/**
 * Общие настройки для motion анимаций
 */
export interface MotionConfig {
  /** Задержка перед началом анимации (сек) */
  delay?: number
  /** Длительность анимации (сек) */
  duration?: number
  /** Анимировать при появлении в viewport */
  once?: boolean
}

/**
 * Тип анимации появления
 */
export type MotionType = 'fade' | 'slide' | 'scale'

/**
 * Направление для slide анимации
 */
export type SlideDirection = 'left' | 'right' | 'up' | 'down'

interface UseMotionVariantsResult {
  /** Viewport настройки */
  viewport: { once: boolean; margin: string }
  /** Transition настройки */
  transition: Transition
}

/**
 * Хук для унификации motion настроек
 */
export function useMotionConfig(config: MotionConfig = {}): UseMotionVariantsResult {
  const { delay = MOTION_DEFAULTS.delay, duration = MOTION_DEFAULTS.duration, once = true } = config

  return {
    viewport: {
      once,
      margin: MOTION_DEFAULTS.viewportMargin,
    },
    transition: {
      duration,
      delay,
      ease: MOTION_DEFAULTS.easingOut as Easing,
    },
  }
}

/**
 * Направления смещения для slide анимации
 */
export const DIRECTION_OFFSET: Record<SlideDirection, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
}

/**
 * Создаёт variants для fade анимации
 */
export function createFadeVariants(yOffset = 20): Variants {
  return {
    hidden: { opacity: 0, y: yOffset },
    visible: { opacity: 1, y: 0 },
  }
}

/**
 * Создаёт variants для slide анимации
 */
export function createSlideVariants(direction: SlideDirection, offset = 50): Variants {
  const { x, y } = DIRECTION_OFFSET[direction]
  return {
    hidden: { opacity: 0, x: x * offset, y: y * offset },
    visible: { opacity: 1, x: 0, y: 0 },
  }
}

/**
 * Создаёт variants для scale анимации
 */
export function createScaleVariants(initialScale = 0.9): Variants {
  return {
    hidden: { opacity: 0, scale: initialScale },
    visible: { opacity: 1, scale: 1 },
  }
}

/**
 * Создаёт variants для stagger контейнера
 */
export function createStaggerContainerVariants(staggerDelay = 0.1, delay = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  }
}

/**
 * Создаёт variants для stagger элемента
 */
export function createStaggerItemVariants(duration = MOTION_DEFAULTS.duration): Variants {
  return {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease: MOTION_DEFAULTS.easingOut as Easing,
      },
    },
  }
}
