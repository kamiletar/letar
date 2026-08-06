/**
 * Хук для блокировки экрана плеера
 *
 * Блокирует все касания чтобы предотвратить случайные нажатия
 * Разблокировка: long press 2 сек
 */

import { useCallback, useRef, useState } from 'react'
import {
  Gesture,
  type GestureStateChangeEvent,
  type LongPressGestureHandlerEventPayload,
} from 'react-native-gesture-handler'

import { useHaptic } from './useHaptic'

/** Время удержания для разблокировки (ms) */
const UNLOCK_HOLD_TIME_MS = 2000

/** Таймаут автоскрытия иконки замка (ms) */
const ICON_AUTO_HIDE_MS = 4000

export interface UseLockScreenResult {
  /** Заблокирован ли экран */
  isLocked: boolean
  /** Видна ли иконка замка (скрывается по таймауту, появляется по тапу) */
  iconVisible: boolean
  /** Заблокировать экран */
  lock: () => void
  /** Разблокировать экран */
  unlock: () => void
  /** Toggle блокировки */
  toggle: () => void
  /** Жест для разблокировки (long press) + показа иконки (tap) */
  unlockGesture: ReturnType<typeof Gesture.Simultaneous>
  /** Прогресс разблокировки (0-1) для анимации */
  unlockProgress: number
}

export function useLockScreen(): UseLockScreenResult {
  const [isLocked, setIsLocked] = useState(false)
  const [iconVisible, setIconVisible] = useState(true)
  const [unlockProgress, setUnlockProgress] = useState(0)
  const haptic = useHaptic()

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const iconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Запустить таймер автоскрытия иконки */
  const startIconTimer = useCallback(() => {
    if (iconTimerRef.current) {
      clearTimeout(iconTimerRef.current)
    }
    iconTimerRef.current = setTimeout(() => {
      setIconVisible(false)
    }, ICON_AUTO_HIDE_MS)
  }, [])

  /** Показать иконку и перезапустить таймер */
  const showIcon = useCallback(() => {
    setIconVisible(true)
    startIconTimer()
  }, [startIconTimer])

  /** Заблокировать экран */
  const lock = useCallback(() => {
    setIsLocked(true)
    setIconVisible(true)
    startIconTimer()
    haptic.medium()
  }, [haptic, startIconTimer])

  /** Разблокировать экран */
  const unlock = useCallback(() => {
    setIsLocked(false)
    setIconVisible(false)
    setUnlockProgress(0)
    if (iconTimerRef.current) {
      clearTimeout(iconTimerRef.current)
    }
    haptic.success()
  }, [haptic])

  /** Toggle блокировки */
  const toggle = useCallback(() => {
    if (isLocked) {
      unlock()
    } else {
      lock()
    }
  }, [isLocked, lock, unlock])

  /** Очистить интервал прогресса */
  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setUnlockProgress(0)
  }, [])

  /** Обработчик начала long press */
  const handleLongPressStart = useCallback(() => {
    if (!isLocked) {
      return
    }

    // Показать иконку при начале long press (для визуального прогресса)
    setIconVisible(true)
    if (iconTimerRef.current) {
      clearTimeout(iconTimerRef.current)
    }

    haptic.light()

    // Запускаем индикатор прогресса
    const startTime = Date.now()
    const updateInterval = 50 // Обновлять каждые 50ms

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / UNLOCK_HOLD_TIME_MS)
      setUnlockProgress(progress)

      if (progress >= 1) {
        clearProgressInterval()
        unlock()
      }
    }, updateInterval)
  }, [isLocked, haptic, clearProgressInterval, unlock])

  /** Обработчик окончания long press */
  const handleLongPressEnd = useCallback(
    (_event: GestureStateChangeEvent<LongPressGestureHandlerEventPayload>) => {
      clearProgressInterval()
      // Если не разблокировали — запустить таймер скрытия иконки
      if (isLocked) {
        startIconTimer()
      }
    },
    [clearProgressInterval, isLocked, startIconTimer],
  )

  /** Long press для разблокировки */
  const longPressGesture = Gesture.LongPress()
    .enabled(isLocked)
    .minDuration(100)
    .maxDistance(50)
    .onBegin(handleLongPressStart)
    .onEnd(handleLongPressEnd)
    .onFinalize(handleLongPressEnd)

  /** Tap для показа/скрытия иконки замка */
  const tapGesture = Gesture.Tap()
    .enabled(isLocked)
    .onEnd(() => {
      if (iconVisible) {
        // Если иконка видна — скрыть
        setIconVisible(false)
        if (iconTimerRef.current) {
          clearTimeout(iconTimerRef.current)
        }
      } else {
        // Если скрыта — показать с таймером
        showIcon()
      }
    })

  /** Комбинированный жест: tap + long press одновременно */
  const unlockGesture = Gesture.Simultaneous(tapGesture, longPressGesture)

  return {
    isLocked,
    iconVisible,
    lock,
    unlock,
    toggle,
    unlockGesture,
    unlockProgress,
  }
}
