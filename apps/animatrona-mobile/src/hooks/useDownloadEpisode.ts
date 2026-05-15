/**
 * Хук для UI кнопки скачивания эпизода
 *
 * Возвращает текущее состояние загрузки и действия.
 */

import { useCallback, useMemo } from 'react'

import { deleteDownloadedEpisode, enqueueEpisodeDownload } from '@/services/downloadManager'
import { type DownloadStatus, useDownloadsStore } from '@/store/downloads'
import type { Episode } from '@letar/animatrona-shared'

export type DownloadButtonState =
  | 'available'
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'error'
  | 'unavailable'

interface UseDownloadEpisodeResult {
  /** Состояние кнопки скачивания */
  state: DownloadButtonState
  /** Прогресс загрузки 0-1 */
  progress: number
  /** Скачано байт */
  downloadedBytes: number
  /** Общий размер */
  totalBytes: number
  /** Текущий элемент загрузки */
  currentItem: 'video' | 'audio' | 'subtitle' | 'font' | null
  /** Сообщение об ошибке */
  errorMessage: string | null
  /** Начать загрузку */
  download: () => void
  /** Удалить скачанный файл */
  remove: () => Promise<void>
  /** Повторить загрузку (после ошибки) */
  retry: () => void
}

/** Маппинг статуса задачи → состояние кнопки */
const STATUS_MAP: Record<DownloadStatus, DownloadButtonState> = {
  queued: 'queued',
  downloading: 'downloading',
  paused: 'paused',
  completed: 'completed',
  error: 'error',
}

export function useDownloadEpisode(animeId: string, animeName: string, episode: Episode): UseDownloadEpisodeResult {
  const queue = useDownloadsStore((s) => s.queue)
  const downloaded = useDownloadsStore((s) => s.downloaded)
  const removeFromQueue = useDownloadsStore((s) => s.removeFromQueue)

  // Найти задачу загрузки для этого эпизода
  const task = useMemo(() => queue.find((t) => t.episodeId === episode.id), [queue, episode.id])

  // Проверить скачан ли
  const isDownloaded = episode.id in downloaded

  // Определить состояние кнопки
  const state: DownloadButtonState = useMemo(() => {
    if (isDownloaded) {
      return 'completed'
    }
    if (task) {
      return STATUS_MAP[task.status]
    }
    // Нет CID видео — нечего скачивать
    if (!episode.videoCid) {
      return 'unavailable'
    }
    return 'available'
  }, [isDownloaded, task, episode.videoCid])

  const download = useCallback(() => {
    enqueueEpisodeDownload(animeId, animeName, episode)
  }, [animeId, animeName, episode])

  const remove = useCallback(async () => {
    await deleteDownloadedEpisode(episode.id)
  }, [episode.id])

  const retry = useCallback(() => {
    // Удалить ошибочную задачу и создать новую
    if (task) {
      removeFromQueue(task.id)
    }
    enqueueEpisodeDownload(animeId, animeName, episode)
  }, [task, removeFromQueue, animeId, animeName, episode])

  return {
    state,
    progress: task?.progress ?? 0,
    downloadedBytes: task?.downloadedBytes ?? 0,
    totalBytes: task?.totalBytes ?? 0,
    currentItem: task?.currentItem ?? null,
    errorMessage: task?.errorMessage ?? null,
    download,
    remove,
    retry,
  }
}
