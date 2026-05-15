/**
 * useAutoHideControls — хук для автоскрытия контролов плеера
 *
 * Автоматически скрывает контролы через HIDE_CONTROLS_TIMEOUT
 * после последнего движения мыши, когда видео воспроизводится
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** Таймаут скрытия контролов (мс) */
const HIDE_CONTROLS_TIMEOUT = 3000

export interface UseAutoHideControlsOptions {
  /** Видео воспроизводится? */
  isPlaying: boolean
  /** Таймаут скрытия (мс) */
  timeout?: number
}

export interface UseAutoHideControlsReturn {
  /** Показывать ли контролы */
  showControls: boolean
  /** Сбросить таймаут скрытия (вызывать при движении мыши) */
  resetHideTimeout: () => void
  /** Показать контролы */
  show: () => void
  /** Скрыть контролы */
  hide: () => void
}

/**
 * Хук для автоскрытия контролов при воспроизведении
 */
export function useAutoHideControls(options: UseAutoHideControlsOptions): UseAutoHideControlsReturn {
  const { isPlaying, timeout = HIDE_CONTROLS_TIMEOUT } = options

  const [showControls, setShowControls] = useState(true)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetHideTimeout = useCallback(() => {
    // Очищаем предыдущий таймер
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    // Показываем контролы
    setShowControls(true)

    // Если видео воспроизводится — запускаем таймер скрытия
    if (isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, timeout)
    }
  }, [isPlaying, timeout])

  // Сброс таймаута при изменении isPlaying
  useEffect(() => {
    resetHideTimeout()
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [isPlaying, resetHideTimeout])

  const show = useCallback(() => {
    setShowControls(true)
  }, [])

  const hide = useCallback(() => {
    setShowControls(false)
  }, [])

  return {
    showControls,
    resetHideTimeout,
    show,
    hide,
  }
}
