/**
 * useGestures — обработка touch-жестов для мобильного плеера
 *
 * Поддерживаемые жесты:
 * - Горизонтальный свайп → seek (перемотка)
 *
 * Убраны:
 * - Вертикальный свайп для громкости/яркости — неудобно, мешает системным жестам
 */

import { useCallback, useRef, useState } from 'react'

/** Тип активного жеста */
export type SwipeGestureType = 'seek' | null

/** Параметры жеста */
export interface GestureState {
  /** Тип активного жеста */
  type: SwipeGestureType
  /** Текущее значение (секунды для seek) */
  value: number
  /** Превью времени для seek */
  seekPreviewTime: number | null
  /** Показывать индикатор */
  showIndicator: boolean
}

/** Опции хука */
export interface UseGesturesOptions {
  /** Callback при seek (время в секундах) */
  onSeek?: (time: number) => void
  /** Callback при начале seek */
  onSeekStart?: () => void
  /** Callback при окончании seek */
  onSeekEnd?: () => void
  /** Текущее время видео */
  currentTime: number
  /** Длительность видео */
  duration: number
  /** Включён ли haptic feedback */
  hapticEnabled?: boolean
}

/** Минимальное расстояние для определения жеста (px) */
const GESTURE_THRESHOLD = 15

/** Чувствительность горизонтального жеста (px на секунду) */
const HORIZONTAL_SENSITIVITY = 3 // 3px = 1 секунда

/** Haptic feedback — лёгкая вибрация */
function triggerHaptic(type: 'light' | 'medium' = 'light') {
  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'light' ? 10 : 25)
  }
}

export function useGestures(options: UseGesturesOptions) {
  const { onSeek, onSeekStart, onSeekEnd, currentTime, duration, hapticEnabled = true } = options

  // Состояние жеста
  const [gestureState, setGestureState] = useState<GestureState>({
    type: null,
    value: 0,
    seekPreviewTime: null,
    showIndicator: false,
  })

  // Refs для отслеживания touch
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const gestureTypeRef = useRef<SwipeGestureType>(null)
  const initialValueRef = useRef<number>(0)

  // Скрытие индикатора с задержкой
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  const scheduleHideIndicator = useCallback(() => {
    clearHideTimeout()
    hideTimeoutRef.current = setTimeout(() => {
      setGestureState((prev) => ({ ...prev, showIndicator: false }))
    }, 600)
  }, [clearHideTimeout])

  // Обработчик начала касания
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) {
        return
      }

      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      }
      gestureTypeRef.current = null
      initialValueRef.current = currentTime
    },
    [currentTime],
  )

  // Обработчик движения
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      const start = touchStartRef.current
      if (!touch || !start) {
        return
      }

      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      // Определяем тип жеста если ещё не определён
      if (!gestureTypeRef.current) {
        // Нужно пройти порог
        if (absDeltaX < GESTURE_THRESHOLD && absDeltaY < GESTURE_THRESHOLD) {
          return
        }

        // Только горизонтальные жесты для seek
        if (absDeltaX > absDeltaY) {
          gestureTypeRef.current = 'seek'
          onSeekStart?.()
          clearHideTimeout()

          if (hapticEnabled) {
            triggerHaptic('medium')
          }
        } else {
          // Вертикальные жесты игнорируем — пропускаем для системных жестов
          return
        }
      }

      // Обрабатываем жест
      const gestureType = gestureTypeRef.current
      if (!gestureType) {
        return
      }

      // Предотвращаем прокрутку
      e.preventDefault()

      if (gestureType === 'seek') {
        // Горизонтальный seek
        const seekDelta = deltaX / HORIZONTAL_SENSITIVITY
        const newTime = Math.max(0, Math.min(duration, initialValueRef.current + seekDelta))

        setGestureState({
          type: 'seek',
          value: seekDelta,
          seekPreviewTime: newTime,
          showIndicator: true,
        })
      }
    },
    [onSeekStart, duration, hapticEnabled, clearHideTimeout],
  )

  // Обработчик окончания касания
  const handleTouchEnd = useCallback(() => {
    const gestureType = gestureTypeRef.current
    const state = gestureState

    if (gestureType === 'seek' && state.seekPreviewTime !== null) {
      // Применяем seek
      onSeek?.(state.seekPreviewTime)
      onSeekEnd?.()
      if (hapticEnabled) {
        triggerHaptic('medium')
      }
    }

    // Сброс
    touchStartRef.current = null
    gestureTypeRef.current = null

    // Скрываем индикатор с задержкой
    scheduleHideIndicator()
  }, [gestureState, onSeek, onSeekEnd, hapticEnabled, scheduleHideIndicator])

  // Обработчик отмены касания
  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null
    gestureTypeRef.current = null
    setGestureState((prev) => ({ ...prev, showIndicator: false, type: null }))
  }, [])

  return {
    gestureState,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  }
}
