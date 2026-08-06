/**
 * usePullToRefresh — хук для pull-to-refresh функциональности
 *
 * Обрабатывает touch events для определения жеста pull-down и вызывает
 * callback обновления с визуальной индикацией и haptic feedback.
 */

import { useCallback, useRef, useState } from 'react'

/** Haptic feedback — лёгкая вибрация */
function triggerHaptic(type: 'light' | 'medium' = 'light') {
  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'light' ? 10 : 25)
  }
}

/** Состояние pull-to-refresh */
export type PullToRefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing'

export interface UsePullToRefreshOptions {
  /** Callback при обновлении (должен вернуть Promise) */
  onRefresh: () => Promise<void>
  /** Порог активации в пикселях (по умолчанию 80) */
  threshold?: number
  /** Максимальное расстояние pull в пикселях (по умолчанию 150) */
  maxPull?: number
  /** Включить haptic feedback (по умолчанию true) */
  hapticEnabled?: boolean
  /** Отключить pull-to-refresh */
  disabled?: boolean
}

export interface UsePullToRefreshResult {
  /** Текущее состояние */
  state: PullToRefreshState
  /** Текущее расстояние pull (0 - maxPull) */
  pullDistance: number
  /** Прогресс до активации (0 - 1) */
  progress: number
  /** Touch handlers для контейнера */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
    onTouchCancel: () => void
  }
  /** CSS transform для контента */
  contentStyle: React.CSSProperties
  /** Показывать ли индикатор */
  showIndicator: boolean
}

export function usePullToRefresh(options: UsePullToRefreshOptions): UsePullToRefreshResult {
  const { onRefresh, threshold = 80, maxPull = 150, hapticEnabled = true, disabled = false } = options

  const [state, setState] = useState<PullToRefreshState>('idle')
  const [pullDistance, setPullDistance] = useState(0)

  // Refs для отслеживания touch
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null)
  const isPullingRef = useRef(false)
  const hadHapticRef = useRef(false)

  // Обработчик начала касания
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || state === 'refreshing') {
        return
      }

      const touch = e.touches[0]
      if (!touch) {
        return
      }

      // Получаем scrollTop контейнера (или документа)
      const target = e.currentTarget as HTMLElement
      const scrollTop = target.scrollTop || document.documentElement.scrollTop || 0

      touchStartRef.current = {
        y: touch.clientY,
        scrollTop,
      }
      isPullingRef.current = false
      hadHapticRef.current = false
    },
    [disabled, state],
  )

  // Обработчик движения
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || state === 'refreshing') {
        return
      }

      const touch = e.touches[0]
      const start = touchStartRef.current
      if (!touch || !start) {
        return
      }

      // Проверяем, что scroll на верху
      const target = e.currentTarget as HTMLElement
      const scrollTop = target.scrollTop || document.documentElement.scrollTop || 0

      // Если не на верху страницы, не активируем pull-to-refresh
      if (scrollTop > 5 && !isPullingRef.current) {
        return
      }

      const deltaY = touch.clientY - start.y

      // Начинаем pull только если тянем вниз
      if (deltaY <= 0) {
        if (isPullingRef.current) {
          isPullingRef.current = false
          setPullDistance(0)
          setState('idle')
        }
        return
      }

      // Активируем pulling
      if (!isPullingRef.current) {
        isPullingRef.current = true
        setState('pulling')
      }

      // Предотвращаем scroll
      e.preventDefault()

      // Применяем resistance (замедление по мере pull)
      const resistance = 0.5
      const actualPull = Math.min(deltaY * resistance, maxPull)

      setPullDistance(actualPull)

      // Состояние ready когда достигли порога
      const isReady = actualPull >= threshold
      setState(isReady ? 'ready' : 'pulling')

      // Haptic при пересечении порога
      if (hapticEnabled && isReady && !hadHapticRef.current) {
        triggerHaptic('medium')
        hadHapticRef.current = true
      } else if (!isReady) {
        hadHapticRef.current = false
      }
    },
    [disabled, state, threshold, maxPull, hapticEnabled],
  )

  // Обработчик окончания касания
  const handleTouchEnd = useCallback(async () => {
    if (disabled || !isPullingRef.current) {
      return
    }

    const wasReady = state === 'ready'

    if (wasReady) {
      // Запускаем обновление
      setState('refreshing')
      setPullDistance(threshold * 0.6) // Уменьшаем pull до размера индикатора

      if (hapticEnabled) {
        triggerHaptic('medium')
      }

      try {
        await onRefresh()
      } finally {
        // Плавно скрываем
        setState('idle')
        setPullDistance(0)
      }
    } else {
      // Отменяем pull
      setState('idle')
      setPullDistance(0)
    }

    touchStartRef.current = null
    isPullingRef.current = false
  }, [disabled, state, threshold, hapticEnabled, onRefresh])

  // Обработчик отмены касания
  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null
    isPullingRef.current = false
    setState('idle')
    setPullDistance(0)
  }, [])

  // Прогресс до активации
  const progress = Math.min(pullDistance / threshold, 1)

  // CSS стили для контента
  const contentStyle: React.CSSProperties = {
    transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
    transition: state === 'idle' ? 'transform 0.3s ease-out' : undefined,
  }

  return {
    state,
    pullDistance,
    progress,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
    contentStyle,
    showIndicator: state !== 'idle' || pullDistance > 0,
  }
}
