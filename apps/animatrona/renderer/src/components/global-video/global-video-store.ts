/**
 * Zustand store для глобального видеоплеера (mini-player)
 *
 * Управляет состоянием видео при навигации между страницами.
 * Video element создаётся ОДИН РАЗ в GlobalVideoProvider (layout-level)
 * и перемещается между контейнерами через appendChild().
 */

import { create } from 'zustand'

import type { GlobalVideoState, PlaybackMetadata, VideoDisplayMode } from './types'

/** Интерфейс Zustand store */
interface GlobalVideoStore extends GlobalVideoState {
  /** Ссылка на video element (persistent, создаётся в Provider) */
  videoElement: HTMLVideoElement | null
  /** Ссылка на audio element для отдельных дорожек */
  audioElement: HTMLAudioElement | null

  // === Actions ===

  /** Инициализировать видео (при переходе на страницу просмотра) */
  initVideo: (src: string, metadata: PlaybackMetadata, startTime?: number) => void

  /** Свернуть в mini-player (embedded → mini) */
  minimize: () => void

  /** Развернуть (mini → embedded, с навигацией на returnPath) */
  expand: () => string | null

  /** Закрыть видео (остановить и сбросить) */
  close: () => void

  /** Обновить текущее время */
  updateTime: (time: number) => void

  /** Обновить длительность */
  updateDuration: (duration: number) => void

  /** Обновить состояние воспроизведения */
  updatePlayingState: (isPlaying: boolean) => void

  /** Обновить громкость */
  updateVolume: (volume: number, isMuted: boolean) => void

  /** Установить video element */
  setVideoElement: (element: HTMLVideoElement | null) => void

  /** Установить audio element */
  setAudioElement: (element: HTMLAudioElement | null) => void

  /** Установить URL отдельной аудиодорожки */
  setAudioSrc: (src: string | null) => void

  /** Установить режим */
  setMode: (mode: VideoDisplayMode) => void

  /** Сбросить состояние */
  reset: () => void
}

/** Начальное состояние */
const initialState: GlobalVideoState & {
  videoElement: HTMLVideoElement | null
  audioElement: HTMLAudioElement | null
} = {
  mode: 'hidden',
  src: null,
  audioSrc: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  volume: 1,
  isMuted: false,
  metadata: null,
  videoElement: null,
  audioElement: null,
}

/**
 * Zustand store для глобального видео
 */
export const useGlobalVideoStore = create<GlobalVideoStore>()((set, get) => ({
  ...initialState,

  initVideo: (src, metadata, startTime = 0) => {
    set({
      mode: 'embedded',
      src,
      metadata,
      currentTime: startTime,
      isPlaying: false,
    })
  },

  minimize: () => {
    const { mode, isPlaying } = get()
    // Сворачиваем только если видео воспроизводится и в режиме embedded
    if (mode === 'embedded' && isPlaying) {
      set({ mode: 'mini' })
    } else if (mode === 'embedded' && !isPlaying) {
      // Если видео на паузе — просто скрываем
      set({ mode: 'hidden' })
    }
  },

  expand: () => {
    const { mode, metadata } = get()
    if (mode === 'mini' && metadata) {
      set({ mode: 'embedded' })
      return metadata.returnPath
    }
    return null
  },

  close: () => {
    const { videoElement, audioElement } = get()
    if (videoElement) {
      videoElement.pause()
      videoElement.currentTime = 0
    }
    if (audioElement) {
      audioElement.pause()
    }
    set({
      mode: 'hidden',
      src: null,
      audioSrc: null,
      isPlaying: false,
      currentTime: 0,
      metadata: null,
    })
  },

  updateTime: (time) => set({ currentTime: time }),

  updateDuration: (duration) => set({ duration }),

  updatePlayingState: (isPlaying) => set({ isPlaying }),

  updateVolume: (volume, isMuted) => set({ volume, isMuted }),

  setVideoElement: (element) => set({ videoElement: element }),

  setAudioElement: (element) => set({ audioElement: element }),

  setAudioSrc: (src) => set({ audioSrc: src }),

  setMode: (mode) => set({ mode }),

  reset: () => set(initialState),
}))

// Экспортируем store в глобальный объект для E2E тестов
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- E2E тесты обращаются к store через window
  ;(window as any).useGlobalVideoStore = useGlobalVideoStore
}
