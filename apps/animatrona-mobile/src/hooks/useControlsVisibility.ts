/**
 * Хук для управления видимостью контролов плеера
 *
 * Автоскрытие через 4 секунды неактивности
 * НЕ скрывать при паузе или активном жесте
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/** Задержка автоскрытия в миллисекундах */
const HIDE_DELAY_MS = 4000

export interface UseControlsVisibilityOptions {
  /** Видео на паузе */
  isPaused: boolean
  /** Активен ли жест (свайп, pan и т.д.) */
  isGestureActive?: boolean
  /** Экран заблокирован */
  isLocked?: boolean
}

export interface UseControlsVisibilityResult {
  /** Показывать ли контролы */
  visible: boolean
  /** Показать контролы (сброс таймера) */
  show: () => void
  /** Скрыть контролы */
  hide: () => void
  /** Toggle видимости */
  toggle: () => void
}

export function useControlsVisibility({
  isPaused,
  isGestureActive = false,
  isLocked = false,
}: UseControlsVisibilityOptions): UseControlsVisibilityResult {
  const [visible, setVisible] = useState(true)
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Очистить таймер */
  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
  }, [])

  /** Запустить таймер скрытия */
  const startHideTimeout = useCallback(() => {
    clearHideTimeout()

    // Не скрывать при паузе, жесте или блокировке
    if (isPaused || isGestureActive || isLocked) {
      return
    }

    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false)
    }, HIDE_DELAY_MS)
  }, [clearHideTimeout, isPaused, isGestureActive, isLocked])

  /** Показать контролы и перезапустить таймер */
  const show = useCallback(() => {
    setVisible(true)
    startHideTimeout()
  }, [startHideTimeout])

  /** Скрыть контролы */
  const hide = useCallback(() => {
    clearHideTimeout()
    setVisible(false)
  }, [clearHideTimeout])

  /** Toggle видимости */
  const toggle = useCallback(() => {
    setVisible((prev) => !prev)
  }, [])

  // Перезапускать таймер при изменении isPaused
  useEffect(() => {
    if (isPaused) {
      // При паузе показываем контролы и не скрываем
      clearHideTimeout()
      setVisible(true)
    } else {
      // При воспроизведении запускаем таймер
      startHideTimeout()
    }
  }, [isPaused, clearHideTimeout, startHideTimeout])

  // Показывать контролы при активном жесте
  useEffect(() => {
    if (isGestureActive) {
      clearHideTimeout()
      setVisible(true)
    } else if (!isPaused && !isLocked) {
      startHideTimeout()
    }
  }, [isGestureActive, isPaused, isLocked, clearHideTimeout, startHideTimeout])

  // Автоскрытие при показе контролов (после toggle или show)
  useEffect(() => {
    if (visible && !isPaused && !isGestureActive && !isLocked) {
      startHideTimeout()
    }
  }, [visible, isPaused, isGestureActive, isLocked, startHideTimeout])

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      clearHideTimeout()
    }
  }, [clearHideTimeout])

  return {
    visible,
    show,
    hide,
    toggle,
  }
}
