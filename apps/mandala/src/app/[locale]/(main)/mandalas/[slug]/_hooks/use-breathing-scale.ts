'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

/** Режимы дыхания (синхронизированы с BreathingGuide) */
export type BreathingMode = '4-7-8' | 'box' | 'relaxing' | 'energizing'

/**
 * Конфигурация режимов дыхания (в секундах)
 * Синхронизирована с BREATHING_PATTERNS в breathing-guide.tsx
 */
const BREATHING_PATTERNS: Record<BreathingMode, { inhale: number; holdIn: number; exhale: number; holdOut: number }> = {
  '4-7-8': { inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },
  box: { inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
  relaxing: { inhale: 4, holdIn: 2, exhale: 6, holdOut: 2 },
  energizing: { inhale: 2, holdIn: 0, exhale: 2, holdOut: 0 },
}

interface UseBreathingScaleOptions {
  /** Включен ли режим дыхания */
  enabled: boolean
  /** Режим дыхания (синхронизируется с BreathingGuide) */
  mode?: BreathingMode
  /** Минимальный масштаб (на выдохе) */
  minScale?: number
  /** Максимальный масштаб (на вдохе) */
  maxScale?: number
}

interface BreathingScaleResult {
  /** Текущий масштаб мандалы */
  scale: number
  /** Текущая фаза дыхания */
  phase: 'inhale' | 'hold-in' | 'exhale' | 'hold-out'
}

/**
 * Хук для синхронизации масштаба мандалы с дыханием.
 * Плавная анимация: вдох → увеличение, выдох → уменьшение.
 * Синхронизирован с BreathingGuide через режим дыхания.
 */
export function useBreathingScale({
  enabled,
  mode = 'relaxing',
  minScale = 0.12,
  maxScale = 1.0,
}: UseBreathingScaleOptions): BreathingScaleResult {
  const [phase, setPhase] = useState<'inhale' | 'hold-in' | 'exhale' | 'hold-out'>('inhale')
  const [scale, setScale] = useState(maxScale)

  const animationFrameRef = useRef<number>(0)
  const phaseStartTimeRef = useRef<number>(0)

  // Получаем паттерн дыхания из режима
  const pattern = useMemo(() => BREATHING_PATTERNS[mode], [mode])

  useEffect(() => {
    if (!enabled) {
      setScale(maxScale)
      setPhase('inhale')
      return
    }

    // Длительности фаз в миллисекундах (из паттерна режима)
    const phaseDurations = {
      inhale: pattern.inhale * 1000,
      'hold-in': pattern.holdIn * 1000,
      exhale: pattern.exhale * 1000,
      'hold-out': pattern.holdOut * 1000,
    }

    const phaseOrder: Array<'inhale' | 'hold-in' | 'exhale' | 'hold-out'> = ['inhale', 'hold-in', 'exhale', 'hold-out']

    let currentPhaseIndex = 0
    phaseStartTimeRef.current = performance.now()

    const animate = (timestamp: number) => {
      const currentPhase = phaseOrder[currentPhaseIndex]
      const phaseDuration = phaseDurations[currentPhase]
      const elapsed = timestamp - phaseStartTimeRef.current
      const progress = Math.min(elapsed / phaseDuration, 1)

      // Вычисляем масштаб в зависимости от фазы
      let newScale: number
      switch (currentPhase) {
        case 'inhale':
          // Плавное увеличение от minScale до maxScale
          newScale = minScale + (maxScale - minScale) * easeInOutSine(progress)
          break
        case 'hold-in':
          // Держим максимальный масштаб
          newScale = maxScale
          break
        case 'exhale':
          // Плавное уменьшение от maxScale до minScale
          newScale = maxScale - (maxScale - minScale) * easeInOutSine(progress)
          break
        case 'hold-out':
          // Держим минимальный масштаб
          newScale = minScale
          break
        default:
          newScale = maxScale
      }

      setScale(newScale)
      setPhase(currentPhase)

      // Переход к следующей фазе
      if (progress >= 1) {
        currentPhaseIndex = (currentPhaseIndex + 1) % phaseOrder.length
        phaseStartTimeRef.current = timestamp
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [enabled, pattern, minScale, maxScale])

  return { scale, phase }
}

/**
 * Плавный ease-in-out для дыхания
 */
function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2
}
