'use client'

import { useCallback, useRef, useState } from 'react'
import { useEventListeners } from './use-event-listener'

/** Ширина edge-зоны для навигации (px) */
const EDGE_ZONE_WIDTH = 50

interface GestureControlsConfig {
  /** Элемент для отслеживания жестов */
  containerRef: React.RefObject<HTMLElement | null>
  /** Включены ли жесты */
  enabled?: boolean
  /** Callback при изменении громкости (delta -1..1) */
  onVolumeChange?: (delta: number) => void
  /** Callback при seek (delta в секундах) — центральный свайп */
  onSeek?: (deltaSeconds: number) => void
  /** Callback для навигации к предыдущей мандале — edge-свайп справа */
  onNavigatePrev?: () => void
  /** Callback для навигации к следующей мандале — edge-свайп слева */
  onNavigateNext?: () => void
  /** Callback при double tap (play/pause) */
  onDoubleTap?: () => void
  /** Callback при вращении (delta в градусах) */
  onRotate?: (deltaDegrees: number) => void
  /** Минимальное расстояние для свайпа */
  swipeThreshold?: number
  /** Время для double tap */
  doubleTapTimeout?: number
}

interface TouchPoint {
  x: number
  y: number
  time: number
}

/**
 * Хук для жестового управления.
 *
 * Поддерживаемые жесты:
 * - Вертикальный свайп по правой половине → громкость
 * - Горизонтальный свайп от края (edge-swipe) → навигация между мандалами
 * - Горизонтальный свайп из центра → seek ±10/30 сек
 * - Double-tap → play/pause
 * - Two-finger rotate → вращение мандалы
 */
export function useGestureControls({
  containerRef,
  enabled = true,
  onVolumeChange,
  onSeek,
  onNavigatePrev,
  onNavigateNext,
  onDoubleTap,
  onRotate,
  swipeThreshold = 30,
  doubleTapTimeout = 300,
}: GestureControlsConfig) {
  const [isGesturing, setIsGesturing] = useState(false)
  const touchStartRef = useRef<TouchPoint | null>(null)
  const lastTapRef = useRef<number>(0)
  const initialTouchesRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const gestureTypeRef = useRef<'none' | 'volume' | 'seek' | 'navigate' | 'rotate'>('none')
  /** Флаг: начато ли касание в edge-зоне */
  const isEdgeStartRef = useRef<'left' | 'right' | 'center'>('center')

  /**
   * Вычисление угла между двумя точками
   */
  const getAngle = useCallback((x1: number, y1: number, x2: number, y2: number): number => {
    return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
  }, [])

  /**
   * Обработка начала касания
   */
  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enabled) {
        return
      }

      const container = containerRef.current
      if (!container) {
        return
      }

      if (event.touches.length === 1) {
        // Одно касание — запоминаем для свайпа/tap
        const touch = event.touches[0]
        const rect = container.getBoundingClientRect()

        // Определяем зону начала касания
        const touchX = touch.clientX - rect.left
        if (touchX < EDGE_ZONE_WIDTH) {
          isEdgeStartRef.current = 'left'
        } else if (touchX > rect.width - EDGE_ZONE_WIDTH) {
          isEdgeStartRef.current = 'right'
        } else {
          isEdgeStartRef.current = 'center'
        }

        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        }
        gestureTypeRef.current = 'none'
      } else if (event.touches.length === 2) {
        // Два касания — для вращения
        const t1 = event.touches[0]
        const t2 = event.touches[1]
        initialTouchesRef.current = {
          x1: t1.clientX,
          y1: t1.clientY,
          x2: t2.clientX,
          y2: t2.clientY,
        }
        gestureTypeRef.current = 'rotate'
        setIsGesturing(true)
      }
    },
    [enabled, containerRef],
  )

  /**
   * Обработка движения касания
   */
  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!enabled) {
        return
      }

      const container = containerRef.current
      if (!container) {
        return
      }

      if (event.touches.length === 1 && touchStartRef.current) {
        const touch = event.touches[0]
        const deltaX = touch.clientX - touchStartRef.current.x
        const deltaY = touch.clientY - touchStartRef.current.y
        const rect = container.getBoundingClientRect()

        // Определяем тип жеста если ещё не определён
        if (gestureTypeRef.current === 'none') {
          if (Math.abs(deltaX) > swipeThreshold || Math.abs(deltaY) > swipeThreshold) {
            // Вертикальный свайп по правой половине → громкость
            if (Math.abs(deltaY) > Math.abs(deltaX) && touchStartRef.current.x > rect.left + rect.width / 2) {
              gestureTypeRef.current = 'volume'
              setIsGesturing(true)
            } // Горизонтальный свайп
            else if (Math.abs(deltaX) > Math.abs(deltaY)) {
              // Edge-свайп → навигация между мандалами
              if (isEdgeStartRef.current !== 'center' && (onNavigatePrev || onNavigateNext)) {
                gestureTypeRef.current = 'navigate'
                setIsGesturing(true)
              } // Center-свайп → seek
              else if (onSeek) {
                gestureTypeRef.current = 'seek'
                setIsGesturing(true)
              }
            }
          }
        }

        // Применяем жест
        if (gestureTypeRef.current === 'volume' && onVolumeChange) {
          // Нормализуем deltaY к -1..1 (инвертируем: вверх = +)
          const volumeDelta = -deltaY / (rect.height / 2)
          onVolumeChange(Math.max(-1, Math.min(1, volumeDelta)))
        } else if (gestureTypeRef.current === 'seek' && onSeek) {
          // Быстрый свайп → 30 сек, медленный → 10 сек
          const speed = Math.abs(deltaX) / (Date.now() - touchStartRef.current.time)
          const seekAmount = speed > 0.5 ? 30 : 10
          const direction = deltaX > 0 ? 1 : -1
          // Вызываем только при значительном смещении
          if (Math.abs(deltaX) > swipeThreshold * 2) {
            onSeek(direction * seekAmount)
            // Сбрасываем стартовую точку чтобы не вызывать повторно
            touchStartRef.current = {
              x: touch.clientX,
              y: touch.clientY,
              time: Date.now(),
            }
          }
        }
      } else if (event.touches.length === 2 && initialTouchesRef.current && onRotate) {
        // Вращение двумя пальцами
        const t1 = event.touches[0]
        const t2 = event.touches[1]
        const initial = initialTouchesRef.current

        const initialAngle = getAngle(initial.x1, initial.y1, initial.x2, initial.y2)
        const currentAngle = getAngle(t1.clientX, t1.clientY, t2.clientX, t2.clientY)
        const deltaAngle = currentAngle - initialAngle

        onRotate(deltaAngle)

        // Обновляем начальные точки
        initialTouchesRef.current = {
          x1: t1.clientX,
          y1: t1.clientY,
          x2: t2.clientX,
          y2: t2.clientY,
        }
      }
    },
    [enabled, containerRef, swipeThreshold, onVolumeChange, onSeek, onNavigatePrev, onNavigateNext, onRotate, getAngle],
  )

  /**
   * Обработка окончания касания
   */
  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!enabled) {
        return
      }

      // Обработка навигации при завершении edge-свайпа
      if (gestureTypeRef.current === 'navigate' && touchStartRef.current && event.changedTouches.length === 1) {
        const touch = event.changedTouches[0]
        const deltaX = touch.clientX - touchStartRef.current.x

        // Свайп вправо от левого края → предыдущая мандала
        if (isEdgeStartRef.current === 'left' && deltaX > swipeThreshold * 2) {
          onNavigatePrev?.()
        } // Свайп влево от правого края → следующая мандала
        else if (isEdgeStartRef.current === 'right' && deltaX < -swipeThreshold * 2) {
          onNavigateNext?.()
        }
      }

      // Проверяем на double tap (только если не было жеста)
      if (gestureTypeRef.current === 'none' && touchStartRef.current && event.changedTouches.length === 1) {
        const touch = event.changedTouches[0]
        const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
        const deltaTime = Date.now() - touchStartRef.current.time

        // Это был tap (не свайп и не долгое нажатие)
        if (deltaX < swipeThreshold && deltaY < swipeThreshold && deltaTime < 300) {
          const now = Date.now()
          if (now - lastTapRef.current < doubleTapTimeout) {
            // Double tap!
            onDoubleTap?.()
            lastTapRef.current = 0
          } else {
            lastTapRef.current = now
          }
        }
      }

      // Сброс
      touchStartRef.current = null
      initialTouchesRef.current = null
      gestureTypeRef.current = 'none'
      isEdgeStartRef.current = 'center'
      setIsGesturing(false)
    },
    [enabled, swipeThreshold, doubleTapTimeout, onDoubleTap, onNavigatePrev, onNavigateNext],
  )

  // Подписка на события через useEventListeners
  useEventListeners(
    enabled ? containerRef.current : null,
    {
      touchstart: handleTouchStart as (e: Event) => void,
      touchmove: handleTouchMove as (e: Event) => void,
      touchend: handleTouchEnd as (e: Event) => void,
    },
    { passive: true },
  )

  return {
    /** Активен ли жест в данный момент */
    isGesturing,
  }
}
