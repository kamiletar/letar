/**
 * useRemoteControl — управление пультом (D-pad, media keys)
 *
 * Подписывается на события от TurboModule KeyEventModule.
 * Маппит Android keyCode на обработчики.
 *
 * При монтировании включает режим перехвата (interceptEnabled = true),
 * чтобы D-pad не использовался для нативной фокус-навигации.
 * При размонтировании — выключает.
 */

import { useEffect } from 'react'
import { NativeEventEmitter } from 'react-native'

import NativeKeyEventModule from '../../specs/NativeKeyEventModule'

const keyEventEmitter = NativeKeyEventModule ? new NativeEventEmitter(NativeKeyEventModule) : null

interface KeyEvent {
  keyCode: number
  /** 0 = ACTION_DOWN, 1 = ACTION_UP */
  action: number
}

/** Android KeyEvent коды */
const KEYS = {
  DPAD_UP: 19,
  DPAD_DOWN: 20,
  DPAD_LEFT: 21,
  DPAD_RIGHT: 22,
  DPAD_CENTER: 23,
  ENTER: 66,
  MEDIA_PLAY_PAUSE: 85,
  MEDIA_REWIND: 89,
  MEDIA_FAST_FORWARD: 90,
  BACK: 4,
} as const

export interface RemoteControlHandlers {
  onLeft?: () => void
  onRight?: () => void
  onUp?: () => void
  onDown?: () => void
  /** DPAD_CENTER / ENTER */
  onSelect?: () => void
  /** Кнопка media play/pause */
  onPlayPause?: () => void
  /** Кнопка media rewind */
  onRewind?: () => void
  /** Кнопка media fast forward */
  onFastForward?: () => void
}

interface UseRemoteControlOptions {
  /** Включить перехват D-pad (отключает нативную фокус-навигацию) */
  interceptDpad?: boolean
}

/**
 * Хук для обработки событий пульта (D-pad remote control)
 *
 * @param handlers Обработчики кнопок
 * @param options interceptDpad — перехватывать D-pad (по умолчанию true)
 */
export function useRemoteControl(handlers: RemoteControlHandlers, options: UseRemoteControlOptions = {}) {
  const { interceptDpad = true } = options

  // Управление режимом перехвата D-pad
  useEffect(() => {
    if (!NativeKeyEventModule) {
      return
    }

    if (interceptDpad) {
      NativeKeyEventModule.setInterceptMode(true)
      return () => {
        NativeKeyEventModule.setInterceptMode(false)
      }
    }
  }, [interceptDpad])

  // Подписка на события клавиш
  useEffect(() => {
    if (!keyEventEmitter) {
      return
    }

    const subscription = keyEventEmitter.addListener('onKeyEvent', (...args: readonly Object[]) => {
      const event = args[0] as KeyEvent

      // Обрабатываем только ACTION_DOWN
      if (event.action !== 0) {
        return
      }

      switch (event.keyCode) {
        case KEYS.DPAD_LEFT:
          handlers.onLeft?.()
          break
        case KEYS.DPAD_RIGHT:
          handlers.onRight?.()
          break
        case KEYS.DPAD_UP:
          handlers.onUp?.()
          break
        case KEYS.DPAD_DOWN:
          handlers.onDown?.()
          break
        case KEYS.DPAD_CENTER:
        case KEYS.ENTER:
          // select имеет приоритет, иначе play/pause
          if (handlers.onSelect) {
            handlers.onSelect()
          } else {
            handlers.onPlayPause?.()
          }
          break
        case KEYS.MEDIA_PLAY_PAUSE:
          handlers.onPlayPause?.()
          break
        case KEYS.MEDIA_REWIND:
          handlers.onRewind?.()
          break
        case KEYS.MEDIA_FAST_FORWARD:
          handlers.onFastForward?.()
          break
      }
    })

    return () => subscription.remove()
  }, [handlers])
}
