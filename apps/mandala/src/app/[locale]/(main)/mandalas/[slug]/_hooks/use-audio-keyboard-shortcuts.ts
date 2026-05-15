'use client'

import { useCallback, useEffect } from 'react'
import type { ViewerSettings } from '../_schemas/viewer-settings.schema'

/**
 * Конфигурация клавиатурных сокращений
 */
interface KeyboardShortcutsConfig {
  /** Текущие настройки */
  settings: ViewerSettings
  /** Callback для изменения настроек */
  onSettingsChange: (settings: Partial<ViewerSettings>) => void
  /** Включены ли горячие клавиши */
  enabled?: boolean
  /** Callback для Play/Pause аудио */
  onPlayPause?: () => void
  /** Callback для переключения на следующий трек */
  onNextTrack?: () => void
  /** Callback для переключения на предыдущий трек */
  onPrevTrack?: () => void
  /** Callback для переключения визуализатора спектра */
  onToggleSpectrum?: () => void
}

/**
 * Хук для клавиатурных сокращений аудио-плеера.
 *
 * Горячие клавиши:
 * - `Space` — Play/Pause
 * - `↑/↓` — Громкость ±5%
 * - `←/→` — Seek ±10 сек (TODO: требует ref на audio)
 * - `M` — Mute/Unmute
 * - `L` — Loop (TODO)
 * - `N/P` — Next/Previous трек
 * - `V` — Toggle визуализатор спектра
 * - `B` — Toggle breathing guide
 * - `1-9` — Seek на 10-90% трека (TODO)
 */
export function useAudioKeyboardShortcuts({
  settings,
  onSettingsChange,
  enabled = true,
  onPlayPause,
  onNextTrack,
  onPrevTrack,
  onToggleSpectrum,
}: KeyboardShortcutsConfig) {
  /**
   * Переключение воспроизведения
   */
  const togglePlayback = useCallback(() => {
    if (onPlayPause) {
      onPlayPause()
    } else {
      onSettingsChange({ audioEnabled: !settings.audioEnabled })
    }
  }, [settings.audioEnabled, onSettingsChange, onPlayPause])

  /**
   * Изменение громкости
   */
  const changeVolume = useCallback(
    (delta: number) => {
      const newVolume = Math.max(0, Math.min(100, settings.audioVolume + delta))
      onSettingsChange({ audioVolume: newVolume })
    },
    [settings.audioVolume, onSettingsChange]
  )

  /**
   * Mute/Unmute (сохраняем предыдущую громкость)
   */
  const toggleMute = useCallback(() => {
    if (settings.audioVolume > 0) {
      // Mute — запоминаем громкость (через localStorage)
      localStorage.setItem('mandala-prev-volume', String(settings.audioVolume))
      onSettingsChange({ audioVolume: 0 })
    } else {
      // Unmute — восстанавливаем громкость
      const prevVolume = parseInt(localStorage.getItem('mandala-prev-volume') || '50', 10)
      onSettingsChange({ audioVolume: prevVolume })
    }
  }, [settings.audioVolume, onSettingsChange])

  /**
   * Переключение режима дыхания
   */
  const toggleBreathing = useCallback(() => {
    onSettingsChange({ breathingEnabled: !settings.breathingEnabled })
  }, [settings.breathingEnabled, onSettingsChange])

  /**
   * Обработчик нажатия клавиш
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Игнорируем если фокус в input/textarea/select
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }

      // Игнорируем если нажаты модификаторы (кроме Shift для громкости)
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault()
          togglePlayback()
          break

        case 'ArrowUp':
          event.preventDefault()
          changeVolume(5)
          break

        case 'ArrowDown':
          event.preventDefault()
          changeVolume(-5)
          break

        case 'KeyM':
          event.preventDefault()
          toggleMute()
          break

        case 'KeyB':
          event.preventDefault()
          toggleBreathing()
          break

        case 'KeyV':
          event.preventDefault()
          onToggleSpectrum?.()
          break

        case 'KeyN':
          event.preventDefault()
          onNextTrack?.()
          break

        case 'KeyP':
          event.preventDefault()
          onPrevTrack?.()
          break

        // TODO: Seek и Loop требуют ref на audio элемент
        // case 'ArrowLeft': seek(-10)
        // case 'ArrowRight': seek(10)
        // case 'KeyL': toggleLoop()
        // case 'Digit1'-'Digit9': seekToPercent(digit * 10)
      }
    },
    [togglePlayback, changeVolume, toggleMute, toggleBreathing, onToggleSpectrum, onNextTrack, onPrevTrack]
  )

  /**
   * Подписка на события клавиатуры
   */
  useEffect(() => {
    if (!enabled) {
      return
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
