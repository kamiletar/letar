/**
 * useKeyboardShortcuts — хук для обработки горячих клавиш плеера
 *
 * Поддерживаемые клавиши:
 * - Space/k: play/pause
 * - ←/→: перемотка назад/вперёд
 * - ↑/↓: громкость
 * - M: mute/unmute
 * - F: fullscreen
 * - [ / ]: скорость воспроизведения ±0.25x
 * - I: информация о видео
 */

import { useEffect } from 'react'

import type { RefObject } from 'react'

/** Время перемотки (секунды) */
const SKIP_TIME = 10

/** Шаг изменения громкости */
const VOLUME_STEP = 0.1

export interface UseKeyboardShortcutsOptions {
  /** Ref на video элемент */
  videoRef: RefObject<HTMLVideoElement | null>
  /** Переключить play/pause */
  togglePlay: () => void
  /** Перемотка на seconds секунд */
  skipTime: (seconds: number) => void
  /** Переключить mute */
  toggleMute: () => void
  /** Переключить fullscreen */
  toggleFullscreen: () => void
  /** Изменить скорость воспроизведения на delta */
  adjustPlaybackSpeed?: (delta: number) => void
  /** Переключить оверлей информации о видео */
  toggleVideoInfo?: () => void
  /** Хук отключен */
  disabled?: boolean
}

/**
 * Хук для регистрации горячих клавиш плеера
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const {
    videoRef,
    togglePlay,
    skipTime: skipTimeFn,
    toggleMute,
    toggleFullscreen,
    adjustPlaybackSpeed,
    toggleVideoInfo,
    disabled = false,
  } = options

  useEffect(() => {
    if (disabled) {
      return
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем если фокус на input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case ' ':
        case 'k':
        case 'л': // Русская раскладка (k)
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipTimeFn(-SKIP_TIME)
          break
        case 'ArrowRight':
          e.preventDefault()
          skipTimeFn(SKIP_TIME)
          break
        case 'ArrowUp':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.volume = Math.min(1, videoRef.current.volume + VOLUME_STEP)
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.volume = Math.max(0, videoRef.current.volume - VOLUME_STEP)
          }
          break
        case 'm':
        case 'ь': // Русская раскладка (m)
          e.preventDefault()
          toggleMute()
          break
        case 'f':
        case 'а': // Русская раскладка (f)
          e.preventDefault()
          toggleFullscreen()
          break
        case '[':
        case 'х': // Русская раскладка
          e.preventDefault()
          adjustPlaybackSpeed?.(-0.25)
          break
        case ']':
        case 'ъ': // Русская раскладка
          e.preventDefault()
          adjustPlaybackSpeed?.(0.25)
          break
        case 'i':
        case 'ш': // Русская раскладка (i)
          e.preventDefault()
          toggleVideoInfo?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [videoRef, togglePlay, skipTimeFn, toggleMute, toggleFullscreen, adjustPlaybackSpeed, toggleVideoInfo, disabled])
}
