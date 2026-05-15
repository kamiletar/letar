/**
 * Хук горячих клавиш плеера
 *
 * Space/K — play/pause, стрелки — перемотка/громкость,
 * M — mute, F — fullscreen, [/] — скорость, I — инфо, T — дорожки, ? — помощь.
 */

import { PLAYBACK_SPEEDS, type PlaybackSpeed } from '@letar/video-player-react'
import { type RefObject, useEffect } from 'react'

interface UseKeyboardShortcutsOptions {
  /** Ref на video элемент */
  videoRef: RefObject<HTMLVideoElement | null>
  /** Переключить play/pause */
  togglePlay: () => void
  /** Пропустить N секунд */
  skipTime: (seconds: number) => void
  /** Переключить mute */
  toggleMute: () => void
  /** Переключить fullscreen */
  toggleFullscreen: () => void
  /** Сменить скорость */
  handlePlaybackSpeedChange: (speed: PlaybackSpeed) => void
  /** Текущая скорость */
  playbackRate: PlaybackSpeed
  /** Переключить инфо */
  toggleVideoInfo: () => void
  /** Переключить режим дорожек */
  toggleTrackMode: () => void
  /** Показаны ли шорткаты */
  showShortcuts: boolean
  /** Переключить показ шорткатов */
  setShowShortcuts: (v: boolean | ((prev: boolean) => boolean)) => void
}

export function useKeyboardShortcuts({
  videoRef,
  togglePlay,
  skipTime,
  toggleMute,
  toggleFullscreen,
  handlePlaybackSpeedChange,
  playbackRate,
  toggleVideoInfo,
  toggleTrackMode,
  showShortcuts,
  setShowShortcuts,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      switch (e.key) {
        case ' ':
        case 'k':
        case 'л':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skipTime(-10)
          break
        case 'ArrowRight':
          e.preventDefault()
          skipTime(10)
          break
        case 'ArrowUp':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.volume = Math.min(1, videoRef.current.volume + 0.1)
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (videoRef.current) {
            videoRef.current.volume = Math.max(0, videoRef.current.volume - 0.1)
          }
          break
        case 'm':
        case 'ь':
          e.preventDefault()
          toggleMute()
          break
        case 'f':
        case 'а':
          e.preventDefault()
          toggleFullscreen()
          break
        case '[':
        case 'х': {
          e.preventDefault()
          const idx = PLAYBACK_SPEEDS.indexOf(playbackRate)
          if (idx > 0) {
            handlePlaybackSpeedChange(PLAYBACK_SPEEDS[idx - 1])
          }
          break
        }
        case ']':
        case 'ъ': {
          e.preventDefault()
          const idx = PLAYBACK_SPEEDS.indexOf(playbackRate)
          if (idx < PLAYBACK_SPEEDS.length - 1) {
            handlePlaybackSpeedChange(PLAYBACK_SPEEDS[idx + 1])
          }
          break
        }
        case 'i':
        case 'ш':
          e.preventDefault()
          toggleVideoInfo()
          break
        case 't':
        case 'е':
          e.preventDefault()
          toggleTrackMode()
          break
        case '?':
          e.preventDefault()
          setShowShortcuts((prev: boolean) => !prev)
          break
        case 'Escape':
          if (showShortcuts) {
            e.preventDefault()
            setShowShortcuts(false)
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    togglePlay,
    skipTime,
    toggleMute,
    toggleFullscreen,
    handlePlaybackSpeedChange,
    playbackRate,
    toggleVideoInfo,
    toggleTrackMode,
    showShortcuts,
    setShowShortcuts,
  ])
}
