/**
 * Zustand store для настроек плеера
 *
 * Хранит пользовательские настройки (размер субтитров и т.д.).
 * Персистится в AsyncStorage для сохранения между сессиями.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface PlayerSettingsState {
  /** Масштаб шрифта субтитров (1.0 = оригинальный размер) */
  subtitleFontScale: number
  setSubtitleFontScale: (scale: number) => void

  /** Предпочтительный индекс аудиодорожки по animeId */
  audioTrackIndex: Record<string, number>
  setAudioTrackIndex: (animeId: string, index: number) => void

  /** Предпочтительный индекс субтитров по animeId */
  subtitleTrackIndex: Record<string, number>
  setSubtitleTrackIndex: (animeId: string, index: number) => void

  /** Режим просмотра: original = яп. аудио + полные субтитры; dubbed = озвучка + надписи */
  viewingMode: 'original' | 'dubbed' | null
  setViewingMode: (mode: 'original' | 'dubbed' | null) => void
}

export const usePlayerSettingsStore = create<PlayerSettingsState>()(
  persist(
    (set) => ({
      subtitleFontScale: 1.0,
      setSubtitleFontScale: (scale) => set({ subtitleFontScale: scale }),

      audioTrackIndex: {},
      setAudioTrackIndex: (animeId, index) =>
        set((state) => ({
          audioTrackIndex: { ...state.audioTrackIndex, [animeId]: index },
        })),

      subtitleTrackIndex: {},
      setSubtitleTrackIndex: (animeId, index) =>
        set((state) => ({
          subtitleTrackIndex: { ...state.subtitleTrackIndex, [animeId]: index },
        })),

      viewingMode: null,
      setViewingMode: (mode) => set({ viewingMode: mode }),
    }),
    {
      name: 'animatrona-player-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
