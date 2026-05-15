'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useHaptic } from './use-haptic'

interface UsePullToRefreshOptions {
  /**
   * Минимальное расстояние в пикселях для активации refresh (по умолчанию 80)
   */
  threshold?: number
  /**
   * Максимальное расстояние pull в пикселях (по умолчанию 120)
   */
  maxPull?: number
  /**
   * Callback при refresh
   */
  onRefresh: () => Promise<void> | void
  /**
   * Отключить pull-to-refresh (например, когда прокручено ниже верха)
   */
  disabled?: boolean
}

interface UsePullToRefreshReturn {
  /**
   * Текущее расстояние pull (0, если не тянем)
   */
  pullDistance: number
  /**
   * Идёт ли сейчас refresh
   */
  isRefreshing: boolean
  /**
   * Готов ли к refresh (достигли threshold)
   */
  canRefresh: boolean
  /**
   * Props для контейнера (touch handlers)
   */
  containerProps: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

/**
 * Хук для реализации pull-to-refresh на мобильных.
 *
 * @example
 * const { pullDistance, isRefreshing, canRefresh, containerProps } = usePullToRefresh({
 *   onRefresh: async () => {
 *     router.refresh()
 *     await new Promise(r => setTimeout(r, 1000))
 *   }
 * })
 *
 * return (
 *   <Box {...containerProps}>
 *     <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} canRefresh={canRefresh} />
 *     {children}
 *   </Box>
 * )
 */
export function usePullToRefresh({
  threshold = 80,
  maxPull = 120,
  onRefresh,
  disabled = false,
}: UsePullToRefreshOptions): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const startYRef = useRef(0)
  const isPullingRef = useRef(false)
  const hapticTriggeredRef = useRef(false)
  const haptic = useHaptic()

  const canRefresh = pullDistance >= threshold

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) {
        return
      }

      // Проверяем, что мы в самом верху страницы
      const scrollTop = window.scrollY || document.documentElement.scrollTop
      if (scrollTop > 0) {
        return
      }

      startYRef.current = e.touches[0].clientY
      isPullingRef.current = true
      hapticTriggeredRef.current = false
    },
    [disabled, isRefreshing]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPullingRef.current || disabled || isRefreshing) {
        return
      }

      const currentY = e.touches[0].clientY
      const deltaY = currentY - startYRef.current

      // Тянем только вниз
      if (deltaY > 0) {
        // Применяем сопротивление (rubber band effect)
        const resistance = 0.5
        const distance = Math.min(deltaY * resistance, maxPull)
        setPullDistance(distance)

        // Haptic feedback при достижении порога
        const reachedThreshold = distance >= threshold
        if (reachedThreshold && !hapticTriggeredRef.current) {
          hapticTriggeredRef.current = true
          haptic.medium()
        } else if (!reachedThreshold && hapticTriggeredRef.current) {
          hapticTriggeredRef.current = false
          haptic.light()
        }

        // Предотвращаем прокрутку страницы когда тянем
        if (distance > 10) {
          e.preventDefault()
        }
      }
    },
    [disabled, isRefreshing, maxPull, threshold, haptic]
  )

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || disabled) {
      return
    }

    isPullingRef.current = false

    if (canRefresh && !isRefreshing) {
      haptic.success()
      setIsRefreshing(true)
      setPullDistance(threshold) // Фиксируем на threshold во время refresh

      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
        setPullDistance(0)
      }
    } else {
      // Плавно возвращаем назад
      setPullDistance(0)
    }
  }, [canRefresh, disabled, isRefreshing, onRefresh, threshold, haptic])

  // Сбрасываем при disabled
  useEffect(() => {
    if (disabled) {
      setPullDistance(0)
      isPullingRef.current = false
    }
  }, [disabled])

  return {
    pullDistance,
    isRefreshing,
    canRefresh,
    containerProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  }
}
