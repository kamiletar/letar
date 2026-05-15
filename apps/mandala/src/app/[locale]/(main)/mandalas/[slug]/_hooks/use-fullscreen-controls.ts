'use client'

/**
 * Хук для управления fullscreen режимом и видимостью контролов.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseFullscreenControlsOptions {
  /** Начальное значение fullscreen из URL */
  initialFullscreen: boolean
  /** Включён ли fullscreen режим */
  isFullscreen: boolean
  /** Callback при выходе из fullscreen */
  onExitFullscreen: () => void
  /** Текущая скорость вращения (для wheel handler) */
  spinDuration: number
  /** Callback изменения скорости */
  onSpinDurationChange: (duration: number) => void
  /** Открыта ли карусель */
  isCarouselOpen: boolean
  /** Callback переключения карусели */
  onToggleCarousel: () => void
  /** Callback закрытия карусели */
  onCloseCarousel: () => void
}

interface UseFullscreenControlsResult {
  /** Видны ли контролы */
  controlsVisible: boolean
  /** Показать контролы и перезапустить таймер скрытия */
  showControls: () => void
  /** Принудительно скрыть контролы */
  hideControls: () => void
}

/** Время автоскрытия контролов в мс (desktop) */
const CONTROLS_HIDE_DELAY_DESKTOP = 3000
/** Время автоскрытия контролов в мс (mobile — дольше для удобства) */
const CONTROLS_HIDE_DELAY_MOBILE = 5000
/** Максимальное время между тапами для double-tap (мс) */
const DOUBLE_TAP_DELAY = 300

/**
 * Определяет, является ли устройство touch-устройством
 */
function isTouchDevice(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Управляет видимостью контролов, keyboard и wheel handlers в fullscreen.
 */
export function useFullscreenControls({
  initialFullscreen,
  isFullscreen,
  onExitFullscreen,
  spinDuration,
  onSpinDurationChange,
  isCarouselOpen,
  onToggleCarousel,
  onCloseCarousel,
}: UseFullscreenControlsOptions): UseFullscreenControlsResult {
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapRef = useRef<number>(0)

  // Показать контролы и запустить таймер скрытия
  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    // Дольше показываем на мобильных устройствах
    const delay = isTouchDevice() ? CONTROLS_HIDE_DELAY_MOBILE : CONTROLS_HIDE_DELAY_DESKTOP
    hideTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false)
    }, delay)
  }, [])

  // Принудительно скрыть контролы
  const hideControls = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    setControlsVisible(false)
  }, [])

  // Обработка double-tap для toggle контролов на мобильных
  const handleDoubleTap = useCallback(() => {
    setControlsVisible((prev) => {
      if (prev) {
        // Скрываем контролы
        if (hideTimeoutRef.current) {
          clearTimeout(hideTimeoutRef.current)
          hideTimeoutRef.current = null
        }
        return false
      } else {
        // Показываем контролы и запускаем таймер
        const delay = isTouchDevice() ? CONTROLS_HIDE_DELAY_MOBILE : CONTROLS_HIDE_DELAY_DESKTOP
        hideTimeoutRef.current = setTimeout(() => {
          setControlsVisible(false)
        }, delay)
        return true
      }
    })
  }, [])

  // Обработка движения мыши и touch событий
  useEffect(() => {
    if (!isFullscreen) {
      return
    }

    const handleMouseMove = () => showControls()

    // Обработка касания — показать контролы или toggle при double-tap
    const handleTouchStart = (e: TouchEvent) => {
      const now = Date.now()
      const timeSinceLastTap = now - lastTapRef.current

      if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
        // Double-tap — toggle контролов
        e.preventDefault()
        handleDoubleTap()
      } else {
        // Single tap — просто показать контролы
        showControls()
      }

      lastTapRef.current = now
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    // Показать при входе в fullscreen
    showControls()

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchstart', handleTouchStart)
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [isFullscreen, showControls, handleDoubleTap])

  // Убрать ?fullscreen=1 из URL после инициализации
  useEffect(() => {
    if (initialFullscreen) {
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [initialFullscreen])

  // Обработка колеса мыши для изменения скорости вращения
  useEffect(() => {
    if (!isFullscreen) {
      return
    }

    const handleWheel = (e: WheelEvent) => {
      const multiplier = spinDuration > 100 ? 100 : spinDuration > 20 ? 10 : 1
      const delta = e.deltaY < 0 ? -multiplier : multiplier
      const newDuration = spinDuration + delta

      if (newDuration > 0 && newDuration < 3600) {
        onSpinDurationChange(newDuration)
      }
    }

    document.body.addEventListener('wheel', handleWheel)
    return () => document.body.removeEventListener('wheel', handleWheel)
  }, [isFullscreen, spinDuration, onSpinDurationChange])

  // Обработка ESC для выхода из fullscreen и 'C' для карусели
  useEffect(() => {
    if (!isFullscreen) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCarouselOpen) {
          onCloseCarousel()
        } else {
          onExitFullscreen()
        }
      } else if (e.key.toLowerCase() === 'c') {
        onToggleCarousel()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen, isCarouselOpen, onExitFullscreen, onToggleCarousel, onCloseCarousel])

  return {
    controlsVisible,
    showControls,
    hideControls,
  }
}
