/**
 * Zustand store для управления загрузками
 *
 * Хранит очередь загрузок и информацию о скачанных эпизодах.
 * Персистится в AsyncStorage для восстановления после перезапуска.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// --- Типы ---

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'error'

/** Задача в очереди загрузки */
export interface DownloadTask {
  /** Уникальный ID задачи */
  id: string
  animeId: string
  animeName: string
  episodeId: string
  episodeNumber: number
  seasonNumber: number
  /** Статус загрузки */
  status: DownloadStatus
  /** Прогресс 0-1 */
  progress: number
  /** Скачано байт */
  downloadedBytes: number
  /** Общий размер (если известен) */
  totalBytes: number
  /** Текущий элемент: video, audio, subtitle, font */
  currentItem: 'video' | 'audio' | 'subtitle' | 'font' | null
  /** Сообщение об ошибке */
  errorMessage: string | null
  /** Время добавления в очередь */
  createdAt: number
}

/** Скачанный эпизод */
export interface DownloadedEpisode {
  animeId: string
  animeName: string
  episodeId: string
  episodeNumber: number
  seasonNumber: number
  /** Путь к видео файлу */
  videoFilePath: string
  /** Пути к аудио файлам: trackId → path */
  audioFilePaths: Record<string, string>
  /** Пути к файлам субтитров: trackId → path */
  subtitleFilePaths: Record<string, string>
  /** Пути к файлам шрифтов: cid → path */
  fontFilePaths: Record<string, string>
  /** Общий размер файлов (байт) */
  totalSizeBytes: number
  /** Время завершения загрузки */
  downloadedAt: number
}

// --- Store ---

interface DownloadsState {
  /** Активная очередь загрузок */
  queue: DownloadTask[]
  /** Скачанные эпизоды: ключ = episodeId */
  downloaded: Record<string, DownloadedEpisode>

  // Actions — Очередь
  /** Добавить эпизод в очередь */
  addToQueue: (
    task: Omit<
      DownloadTask,
      'id' | 'status' | 'progress' | 'downloadedBytes' | 'totalBytes' | 'currentItem' | 'errorMessage' | 'createdAt'
    >,
  ) => string
  /** Обновить прогресс загрузки */
  updateProgress: (
    taskId: string,
    progress: number,
    downloadedBytes: number,
    totalBytes: number,
    currentItem?: DownloadTask['currentItem'],
  ) => void
  /** Начать загрузку (queued → downloading) */
  startDownload: (taskId: string) => void
  /** Пауза */
  pauseDownload: (taskId: string) => void
  /** Возобновить */
  resumeDownload: (taskId: string) => void
  /** Ошибка загрузки */
  failDownload: (taskId: string, errorMessage: string) => void
  /** Удалить задачу из очереди */
  removeFromQueue: (taskId: string) => void

  // Actions — Скачанные
  /** Отметить загрузку как завершённую */
  completeDownload: (taskId: string, episode: DownloadedEpisode) => void
  /** Удалить скачанный эпизод */
  removeDownloaded: (episodeId: string) => void
  /** Удалить все скачанные эпизоды аниме */
  removeAnimeDownloads: (animeId: string) => void
  /** Очистить все данные (очередь + скачанные) */
  clearAll: () => void

  // Selectors
  /** Проверить скачан ли эпизод */
  isEpisodeDownloaded: (episodeId: string) => boolean
  /** Получить задачу загрузки для эпизода */
  getEpisodeTask: (episodeId: string) => DownloadTask | undefined
  /** Получить скачанные эпизоды аниме */
  getAnimeDownloads: (animeId: string) => DownloadedEpisode[]
  /** Следующая задача в очереди (первая со статусом queued) */
  getNextInQueue: () => DownloadTask | undefined
}

let taskIdCounter = 0

export const useDownloadsStore = create<DownloadsState>()(
  persist(
    (set, get) => ({
      queue: [],
      downloaded: {},

      // --- Очередь ---

      addToQueue: (task) => {
        const id = `dl_${Date.now()}_${++taskIdCounter}`
        const newTask: DownloadTask = {
          ...task,
          id,
          status: 'queued',
          progress: 0,
          downloadedBytes: 0,
          totalBytes: 0,
          currentItem: null,
          errorMessage: null,
          createdAt: Date.now(),
        }

        set((state) => ({
          queue: [...state.queue, newTask],
        }))

        return id
      },

      updateProgress: (taskId, progress, downloadedBytes, totalBytes, currentItem) => {
        set((state) => ({
          queue: state.queue.map((t) =>
            t.id === taskId
              ? { ...t, progress, downloadedBytes, totalBytes, currentItem: currentItem ?? t.currentItem }
              : t
          ),
        }))
      },

      startDownload: (taskId) => {
        set((state) => ({
          queue: state.queue.map((t) => (t.id === taskId ? { ...t, status: 'downloading' as const } : t)),
        }))
      },

      pauseDownload: (taskId) => {
        set((state) => ({
          queue: state.queue.map((t) => (t.id === taskId ? { ...t, status: 'paused' as const } : t)),
        }))
      },

      resumeDownload: (taskId) => {
        set((state) => ({
          queue: state.queue.map((t) => (t.id === taskId ? { ...t, status: 'queued' as const } : t)),
        }))
      },

      failDownload: (taskId, errorMessage) => {
        set((state) => ({
          queue: state.queue.map((t) => (t.id === taskId ? { ...t, status: 'error' as const, errorMessage } : t)),
        }))
      },

      removeFromQueue: (taskId) => {
        set((state) => ({
          queue: state.queue.filter((t) => t.id !== taskId),
        }))
      },

      // --- Скачанные ---

      completeDownload: (taskId, episode) => {
        set((state) => ({
          queue: state.queue.filter((t) => t.id !== taskId),
          downloaded: {
            ...state.downloaded,
            [episode.episodeId]: episode,
          },
        }))
      },

      removeDownloaded: (episodeId) => {
        set((state) => {
          const { [episodeId]: _, ...rest } = state.downloaded
          return { downloaded: rest }
        })
      },

      removeAnimeDownloads: (animeId) => {
        set((state) => {
          const filtered: Record<string, DownloadedEpisode> = {}
          for (const [key, ep] of Object.entries(state.downloaded)) {
            if (ep.animeId !== animeId) {
              filtered[key] = ep
            }
          }
          return { downloaded: filtered }
        })
      },

      clearAll: () => {
        set({ queue: [], downloaded: {} })
      },

      // --- Selectors ---

      isEpisodeDownloaded: (episodeId) => {
        return episodeId in get().downloaded
      },

      getEpisodeTask: (episodeId) => {
        return get().queue.find((t) => t.episodeId === episodeId)
      },

      getAnimeDownloads: (animeId) => {
        return Object.values(get().downloaded).filter((ep) => ep.animeId === animeId)
      },

      getNextInQueue: () => {
        return get().queue.find((t) => t.status === 'queued')
      },
    }),
    {
      name: 'animatrona-downloads',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Сохраняем очередь (для восстановления после перезапуска) и скачанные
        queue: state.queue.map((t) => ({
          ...t,
          // Сбрасываем downloading → queued при восстановлении
          status: t.status === 'downloading' ? ('queued' as const) : t.status,
        })),
        downloaded: state.downloaded,
      }),
      // Миграция v1→v2: audioFilePath/audioTrackId → audioFilePaths, + fontFilePaths
      migrate: (persisted, version) => {
        if (version < 2) {
          const state = persisted as Record<string, unknown>
          const downloaded = (state.downloaded ?? {}) as Record<string, Record<string, unknown>>
          for (const ep of Object.values(downloaded)) {
            // Миграция одиночного аудио → Record
            if (!ep.audioFilePaths) {
              const oldPath = ep.audioFilePath as string | null
              const oldId = ep.audioTrackId as string | null
              ep.audioFilePaths = oldPath && oldId ? { [oldId]: oldPath } : {}
              delete ep.audioFilePath
              delete ep.audioTrackId
            }
            // Добавляем пустой fontFilePaths
            if (!ep.fontFilePaths) {
              ep.fontFilePaths = {}
            }
          }
        }
        return persisted as DownloadsState
      },
    },
  ),
)
