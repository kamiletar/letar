/**
 * Хук для Picture-in-Picture режима на Android
 *
 * PiP позволяет смотреть видео в маленьком окне поверх других приложений.
 * Поддерживает media actions (play/pause) через кнопки в PiP окне.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus, NativeEventEmitter, Platform } from 'react-native'

import NativePipModule from '../../specs/NativePipModule'

/** Задержка после выхода из PiP, в течение которой autoEnter заблокирован (мс) */
const PIP_REENTRY_COOLDOWN = 1500

const pipEmitter = NativePipModule ? new NativeEventEmitter(NativePipModule) : null

/** Тип действия из PiP окна */
export type PipAction = 'play' | 'pause'

interface UsePictureInPictureOptions {
  /** Включить автоматический PiP при сворачивании приложения */
  autoEnterOnBackground?: boolean
  /** Соотношение сторон (ширина / высота) */
  aspectRatio?: [number, number]
  /** Колбэк при нажатии кнопок в PiP окне */
  onPipAction?: (action: PipAction) => void
}

interface UsePictureInPictureResult {
  /** Доступен ли PiP на устройстве */
  isPipAvailable: boolean
  /** Находится ли приложение в PiP режиме */
  isInPipMode: boolean
  /** Войти в PiP режим */
  enterPipMode: () => Promise<boolean>
  /** Выйти из PiP режима */
  exitPipMode: () => void
  /** Обновить состояние воспроизведения (для синхронизации кнопок PiP) */
  updatePlaybackState: (isPlaying: boolean) => void
}

export function usePictureInPicture(options: UsePictureInPictureOptions = {}): UsePictureInPictureResult {
  const { autoEnterOnBackground = false, aspectRatio = [16, 9], onPipAction } = options

  const [isInPipMode, setIsInPipMode] = useState(false)
  const [isPipAvailable] = useState(() => {
    // PiP доступен только на Android 8.0+ (API 26+)
    return Platform.OS === 'android' && Platform.Version >= 26 && !!NativePipModule
  })

  // Ref для колбэка чтобы избежать пересоздания подписок
  const onPipActionRef = useRef(onPipAction)
  onPipActionRef.current = onPipAction

  // Синхронный ref для отслеживания PiP состояния (useState асинхронный — ненадёжен для race conditions)
  const isInPipModeRef = useRef(false)

  // Таймстамп последнего выхода из PiP — для защиты от цикла повторного входа
  const lastPipExitRef = useRef(0)

  /** Обновить PiP state синхронно (ref) и асинхронно (useState) */
  const updatePipState = useCallback((newState: boolean) => {
    if (!newState && isInPipModeRef.current) {
      // Выход из PiP — ставим cooldown при ЛЮБОМ сбросе, не только от нативного события
      lastPipExitRef.current = Date.now()
    }
    isInPipModeRef.current = newState
    setIsInPipMode(newState)
  }, [])

  // Автоматический PiP при сворачивании (с защитой от цикла)
  useEffect(() => {
    if (!isPipAvailable || !autoEnterOnBackground) {
      return
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Используем ref — он синхронный и всегда актуальный
      if (nextAppState === 'background' && !isInPipModeRef.current) {
        // Блокируем auto-enter если недавно вышли из PiP (защита от цикла)
        const timeSinceExit = Date.now() - lastPipExitRef.current
        if (timeSinceExit < PIP_REENTRY_COOLDOWN) {
          return
        }
        enterPipMode()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [isPipAvailable, autoEnterOnBackground])

  // Слушаем события PiP от TurboModule через NativeEventEmitter
  useEffect(() => {
    if (!isPipAvailable || !pipEmitter) {
      return
    }

    const pipModeSubscription = pipEmitter.addListener(
      'onPictureInPictureModeChanged',
      (...args: readonly Object[]) => {
        const event = args[0] as { isInPipMode: boolean }
        updatePipState(event.isInPipMode)
      },
    )

    const pipActionSubscription = pipEmitter.addListener('onPipAction', (...args: readonly Object[]) => {
      const event = args[0] as { action: PipAction }
      onPipActionRef.current?.(event.action)
    })

    return () => {
      pipModeSubscription.remove()
      pipActionSubscription.remove()
    }
  }, [isPipAvailable, updatePipState])

  // Страховка: при возврате в foreground гарантированно сбрасываем PiP state
  // (на Android < 12 нативное событие может не доставиться из PAUSED state)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        updatePipState(false)
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [updatePipState])

  const enterPipMode = useCallback(async (): Promise<boolean> => {
    if (!isPipAvailable || !NativePipModule) {
      console.warn('PiP is not available on this device')
      return false
    }

    try {
      // Скрываем UI ДО входа в PiP — на Android < 12 Activity переходит в PAUSED state
      // и React не сможет перерисовать после входа
      updatePipState(true)

      // requestAnimationFrame гарантирует что React отрисует скрытый UI до вызова native
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

      const result = await NativePipModule.enterPictureInPictureMode({
        aspectRatio: {
          numerator: aspectRatio[0],
          denominator: aspectRatio[1],
        },
      })

      if (!result) {
        // Если не удалось войти в PiP — восстанавливаем UI
        updatePipState(false)
      }

      return result
    } catch (error) {
      console.error('Failed to enter PiP mode:', error)
      updatePipState(false)
      return false
    }
  }, [isPipAvailable, aspectRatio, updatePipState])

  const exitPipMode = useCallback(() => {
    if (!isPipAvailable || !NativePipModule) {
      return
    }

    try {
      NativePipModule.exitPictureInPictureMode()
    } catch (error) {
      console.error('Failed to exit PiP mode:', error)
    }
  }, [isPipAvailable])

  const updatePlaybackState = useCallback(
    (isPlaying: boolean) => {
      if (!isPipAvailable || !NativePipModule) {
        return
      }

      try {
        NativePipModule.updatePlaybackState(isPlaying)
      } catch (error) {
        console.error('Failed to update PiP playback state:', error)
      }
    },
    [isPipAvailable],
  )

  return {
    isPipAvailable,
    isInPipMode,
    enterPipMode,
    exitPipMode,
    updatePlaybackState,
  }
}
