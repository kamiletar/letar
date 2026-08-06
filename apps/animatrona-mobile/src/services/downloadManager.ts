/**
 * Оркестрация загрузок эпизодов
 *
 * - FIFO очередь, 1 параллельная загрузка
 * - Скачивает видео + аудио + субтитры
 * - Отслеживает прогресс через Zustand store
 * - Поддерживает паузу и resume
 */

import { Platform } from 'react-native'
import ReactNativeBlobUtil, { type FetchBlobResponse, type StatefulPromise } from 'react-native-blob-util'

import NativeDownloadServiceModule from '../../specs/NativeDownloadServiceModule'

import { getAudioCidUrl, getIpfsUrl, getVideoCidUrl } from '@/api/client'
import { type DownloadedEpisode, useDownloadsStore } from '@/store/downloads'
import { useServersStore } from '@/store/servers'
import type { AudioTrack, Episode, SubtitleTrack } from '@letar/animatrona-shared'

import {
  ensureParentDir,
  getAudioPath,
  getFileSize,
  getFontDir,
  getFontPath,
  getSubtitlePath,
  getVideoPath,
} from './fileStorage'

// --- Foreground Service (Android) ---

const DownloadServiceModule = Platform.OS === 'android' ? NativeDownloadServiceModule : undefined

/** Флаг: foreground service запущен */
let isServiceRunning = false
/** Последний отправленный процент (throttle целыми числами) */
let lastServicePercent = -1

/** Запустить foreground service при начале загрузки */
function startForegroundService(title: string): void {
  if (!DownloadServiceModule || isServiceRunning) {
    return
  }
  try {
    DownloadServiceModule.startService(title)
    isServiceRunning = true
    lastServicePercent = -1
    // eslint-disable-next-line no-console
    console.log('[downloadManager] Foreground service запущен')
  } catch (error) {
    console.warn('[downloadManager] Не удалось запустить foreground service:', error)
  }
}

/** Обновить прогресс в notification (throttle: только при изменении целого %) */
function updateServiceProgress(title: string, progress: number): void {
  if (!DownloadServiceModule || !isServiceRunning) {
    return
  }
  const percent = Math.round(progress * 100)
  if (percent === lastServicePercent) {
    return
  }
  lastServicePercent = percent
  try {
    DownloadServiceModule.updateProgress(title, percent)
  } catch {
    /* не критично */
  }
}

/** Остановить foreground service */
function stopForegroundService(): void {
  if (!DownloadServiceModule || !isServiceRunning) {
    return
  }
  try {
    DownloadServiceModule.stopService()
    isServiceRunning = false
    lastServicePercent = -1
    // eslint-disable-next-line no-console
    console.log('[downloadManager] Foreground service остановлен')
  } catch {
    /* не критично */
  }
}

// --- Состояние менеджера ---

/** Активная задача скачивания (для отмены) */
let activeTask: StatefulPromise<FetchBlobResponse> | null = null
/** ID текущей задачи в очереди */
let activeTaskId: string | null = null
/** Флаг: менеджер запущен */
let isRunning = false

// --- Публичный API ---

/** Запустить обработку очереди */
export function startDownloadManager(): void {
  if (isRunning) {
    return
  }
  isRunning = true
  // eslint-disable-next-line no-console
  console.log('[downloadManager] Запуск')
  processQueue()
}

/** Остановить менеджер */
export function stopDownloadManager(): void {
  isRunning = false
  cancelActiveDownload()
  stopForegroundService()
  // eslint-disable-next-line no-console
  console.log('[downloadManager] Остановлен')
}

/** Отменить текущую загрузку */
export function cancelActiveDownload(): void {
  if (activeTask) {
    try {
      activeTask.cancel()
    } catch {
      // Игнорируем — задача может быть уже завершена
    }
    activeTask = null
    activeTaskId = null
  }
}

/** Приостановить текущую загрузку */
export function pauseActiveDownload(): void {
  const store = useDownloadsStore.getState()
  if (activeTaskId) {
    store.pauseDownload(activeTaskId)
    cancelActiveDownload()
    // processQueue подхватит следующую задачу или остановится
    processQueue()
  }
}

// --- Обработка очереди ---

async function processQueue(): Promise<void> {
  if (!isRunning) {
    return
  }
  if (activeTaskId) {
    return // Уже что-то качается
  }

  const store = useDownloadsStore.getState()
  const next = store.getNextInQueue()

  if (!next) {
    // eslint-disable-next-line no-console
    console.log('[downloadManager] Очередь пуста')
    stopForegroundService()
    return
  }

  // Запускаем foreground service при начале первой загрузки из очереди
  const serviceTitle = `${next.animeName ?? 'Загрузка'} — Ep. ${next.episodeNumber ?? '?'}`
  startForegroundService(serviceTitle)

  activeTaskId = next.id
  store.startDownload(next.id)

  try {
    const episode = await downloadEpisode(next)
    store.completeDownload(next.id, episode)
    // eslint-disable-next-line no-console
    console.log('[downloadManager] Загрузка завершена:', next.episodeId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка'

    // Не логируем отмену как ошибку
    if (message !== 'canceled') {
      console.error('[downloadManager] Ошибка загрузки:', next.episodeId, message)
      store.failDownload(next.id, message)
    }
  } finally {
    activeTask = null
    activeTaskId = null
  }

  // Обработать следующую задачу
  if (isRunning) {
    processQueue()
  }
}

// --- Загрузка эпизода ---

/** Подготовить данные для скачивания на основе эпизода из кэша/API */
interface DownloadConfig {
  animeId: string
  episodeId: string
  /** CID видео */
  videoCid: string | null
  /** Все аудиодорожки для скачивания */
  audioTracks: AudioTrack[]
  /** Субтитры для скачивания */
  subtitleTracks: SubtitleTrack[]
  /** CID шрифтов для ASS субтитров */
  fontCids: string[]
}

/** Скачать эпизод из существующей задачи в очереди */
async function downloadEpisode(task: { id: string; animeId: string; episodeId: string }): Promise<DownloadedEpisode> {
  const store = useDownloadsStore.getState()

  // Получаем конфигурацию из кэша деталей аниме
  const { activeServerId } = useServersStore.getState()
  const { getCachedAnimeDetails } = await import('./cache')
  const anime = activeServerId ? await getCachedAnimeDetails(activeServerId, task.animeId) : null

  if (!anime) {
    throw new Error('Нет кэшированных данных аниме — невозможно определить файлы для загрузки')
  }

  const episode = anime.episodes.find((ep) => ep.id === task.episodeId)
  if (!episode) {
    throw new Error(`Эпизод ${task.episodeId} не найден в данных аниме`)
  }

  if (!episode.videoCid) {
    throw new Error('У эпизода нет CID видео')
  }

  // Все аудиодорожки с CID
  const allAudio = episode.audioTracks.filter((t) => t.audioCid)
  const allSubs = episode.subtitleTracks.filter((t) => t.fileCid)

  // Собираем уникальные CID шрифтов из ASS субтитров
  const fontCidSet = new Set<string>()
  for (const sub of allSubs) {
    if ((sub.format === 'ass' || sub.format === 'ssa') && sub.fontCids) {
      for (const cid of sub.fontCids) {
        fontCidSet.add(cid)
      }
    }
  }

  const config: DownloadConfig = {
    animeId: task.animeId,
    episodeId: task.episodeId,
    videoCid: episode.videoCid,
    audioTracks: allAudio,
    subtitleTracks: allSubs,
    fontCids: [...fontCidSet],
  }

  let totalDownloaded = 0
  let totalSize = 0

  // --- 1. Скачать видео ---
  store.updateProgress(task.id, 0, 0, 0, 'video')

  const videoPath = getVideoPath(config.animeId, config.episodeId)
  await ensureParentDir(videoPath)

  const serviceTitle = `${anime.name} — Ep. ${episode.number}`
  // videoCid проверен на null выше (throw), безопасно приводим
  const videoUrl = getVideoCidUrl(config.videoCid as string)
  await downloadFile(videoUrl, videoPath, task.id, (received, total) => {
    totalSize = total
    totalDownloaded = received
    const progress = total > 0 ? received / total : 0
    store.updateProgress(task.id, progress * 0.8, received, total, 'video') // 80% на видео
    updateServiceProgress(serviceTitle, progress * 0.8)
  })

  const videoSize = await getFileSize(videoPath)
  totalDownloaded = videoSize

  // --- 2. Скачать все аудиодорожки ---
  const audioFilePaths: Record<string, string> = {}

  if (config.audioTracks.length > 0) {
    const audioCount = config.audioTracks.length
    let audioIdx = 0

    for (const track of config.audioTracks) {
      if (!track.audioCid) {
        continue
      }

      const audioProgress = audioIdx / audioCount
      store.updateProgress(task.id, 0.7 + audioProgress * 0.2, totalDownloaded, totalSize, 'audio')

      const audioPath = getAudioPath(config.animeId, config.episodeId, track.id)
      await ensureParentDir(audioPath)

      const audioUrl = getAudioCidUrl(track.audioCid)
      try {
        await downloadFile(audioUrl, audioPath, task.id, (received, total) => {
          const trackProgress = total > 0 ? received / total : 0
          const overallAudioProgress = (audioIdx + trackProgress) / audioCount
          const overallProgress = 0.7 + overallAudioProgress * 0.2
          store.updateProgress(task.id, overallProgress, totalDownloaded + received, totalSize + total, 'audio')
          updateServiceProgress(serviceTitle, overallProgress)
        })

        const audioSize = await getFileSize(audioPath)
        totalDownloaded += audioSize
        audioFilePaths[track.id] = audioPath
      } catch (error) {
        console.warn('[downloadManager] Ошибка скачивания аудио:', track.id, error)
      }

      audioIdx++
    }
  }

  // --- 3. Скачать субтитры ---
  const subtitleFilePaths: Record<string, string> = {}

  if (config.subtitleTracks.length > 0) {
    store.updateProgress(task.id, 0.9, totalDownloaded, totalSize, 'subtitle')

    for (const track of config.subtitleTracks) {
      if (!track.fileCid) {
        continue
      }

      const subPath = getSubtitlePath(config.animeId, config.episodeId, track.id, track.format)
      await ensureParentDir(subPath)

      const subUrl = getIpfsUrl(track.fileCid)
      try {
        await downloadFile(subUrl, subPath, task.id)
        subtitleFilePaths[track.id] = subPath
      } catch (error) {
        // Субтитры некритичны — логируем и продолжаем
        console.warn('[downloadManager] Ошибка скачивания субтитров:', track.id, error)
      }
    }
  }

  // --- 4. Скачать шрифты для ASS субтитров ---
  const fontFilePaths: Record<string, string> = {}

  if (config.fontCids.length > 0) {
    store.updateProgress(task.id, 0.95, totalDownloaded, totalSize, 'font')

    // Создаём директорию шрифтов эпизода
    const fontDir = getFontDir(config.animeId, config.episodeId)
    await ensureParentDir(fontDir + '/placeholder')

    for (const fontCid of config.fontCids) {
      const fontPath = getFontPath(config.animeId, config.episodeId, fontCid)

      const fontUrl = getIpfsUrl(fontCid)
      try {
        await downloadFile(fontUrl, fontPath, task.id)
        fontFilePaths[fontCid] = fontPath
      } catch (error) {
        // Шрифты некритичны — логируем и продолжаем
        console.warn('[downloadManager] Ошибка скачивания шрифта:', fontCid, error)
      }
    }
  }

  // --- Готово ---
  store.updateProgress(task.id, 1, totalDownloaded, totalSize, null)

  return {
    animeId: config.animeId,
    animeName: anime.name,
    episodeId: config.episodeId,
    episodeNumber: episode.number,
    seasonNumber: episode.seasonNumber,
    videoFilePath: videoPath,
    audioFilePaths,
    subtitleFilePaths,
    fontFilePaths,
    totalSizeBytes: totalDownloaded,
    downloadedAt: Date.now(),
  }
}

// --- Загрузка файла ---

/** Таймауты загрузки */
const STALL_AT_100_TIMEOUT = 30_000 // 30 сек зависания на 100%
const NO_PROGRESS_TIMEOUT = 300_000 // 5 мин без прогресса (IPFS может стоять при DHT-поиске)
const WATCHDOG_INTERVAL = 10_000 // Проверка каждые 10 сек
/** Допустимая погрешность размера файла (1%) */
const FILE_SIZE_TOLERANCE = 0.01

/** Скачать один файл с прогрессом */
async function downloadFile(
  url: string,
  destPath: string,
  _taskId: string,
  onProgress?: (received: number, total: number) => void,
): Promise<void> {
  const task = ReactNativeBlobUtil.config({
    path: destPath,
    overwrite: true,
  }).fetch('GET', url)

  // Сохраняем ссылку для отмены
  activeTask = task

  // Состояние прогресса для watchdog
  let lastTotal = 0
  let lastProgressTime = Date.now()
  let reachedFullAt: number | null = null

  // Всегда отслеживаем прогресс — watchdog требует обновлений даже без внешнего onProgress
  task.progress((received, total) => {
    const r = Number(received)
    const t = Number(total)
    lastTotal = t
    lastProgressTime = Date.now()

    // Фиксируем момент достижения 100%
    if (t > 0 && r >= t && !reachedFullAt) {
      reachedFullAt = Date.now()
    }

    if (onProgress) {
      onProgress(r, t)
    }
  })

  // Watchdog: проверяем зависание каждые WATCHDOG_INTERVAL мс
  const watchdog = setInterval(async () => {
    const now = Date.now()

    // Проверка 1: зависание на 100%
    if (reachedFullAt && now - reachedFullAt > STALL_AT_100_TIMEOUT) {
      console.warn(
        `[downloadFile] Зависание на 100% (${Math.round((now - reachedFullAt) / 1000)}с), проверяю файл на диске...`,
      )
      try {
        const fileSize = await getFileSize(destPath)
        const expectedSize = lastTotal
        if (expectedSize > 0 && fileSize >= expectedSize * (1 - FILE_SIZE_TOLERANCE)) {
          // eslint-disable-next-line no-console
          console.log(`[downloadFile] Файл на диске OK: ${fileSize} / ${expectedSize} байт, принудительно завершаю`)
          try {
            task.cancel()
          } catch {
            /* уже завершена */
          }
          return
        }
      } catch {
        /* ошибка stat — продолжаем ждать */
      }
    }

    // Проверка 2: нет прогресса больше NO_PROGRESS_TIMEOUT
    if (now - lastProgressTime > NO_PROGRESS_TIMEOUT) {
      console.error(`[downloadFile] Нет прогресса ${Math.round((now - lastProgressTime) / 1000)}с, отменяю загрузку`)
      try {
        task.cancel()
      } catch {
        /* уже завершена */
      }
    }
  }, WATCHDOG_INTERVAL)

  try {
    await task
  } catch (error) {
    // Если загрузка отменена watchdog'ом на 100% — проверяем файл, не бросаем ошибку
    if (reachedFullAt) {
      const fileSize = await getFileSize(destPath)
      if (lastTotal > 0 && fileSize >= lastTotal * (1 - FILE_SIZE_TOLERANCE)) {
        // eslint-disable-next-line no-console
        console.log(`[downloadFile] Загрузка отменена на 100%, но файл полный (${fileSize} байт) — считаем успехом`)
        return
      }
    }
    throw error
  } finally {
    clearInterval(watchdog)
  }
}

// --- Публичные хелперы ---

/** Начать загрузку конкретного эпизода */
export function enqueueEpisodeDownload(animeId: string, animeName: string, episode: Episode): string {
  const store = useDownloadsStore.getState()

  // Проверяем дубликаты
  const existing = store.getEpisodeTask(episode.id)
  if (existing) {
    // eslint-disable-next-line no-console
    console.log('[downloadManager] Эпизод уже в очереди:', episode.id)
    return existing.id
  }

  if (store.isEpisodeDownloaded(episode.id)) {
    // eslint-disable-next-line no-console
    console.log('[downloadManager] Эпизод уже скачан:', episode.id)
    return ''
  }

  const taskId = store.addToQueue({
    animeId,
    animeName,
    episodeId: episode.id,
    episodeNumber: episode.number,
    seasonNumber: episode.seasonNumber,
  })

  // Запустить обработку очереди если менеджер запущен
  if (isRunning) {
    processQueue()
  } else {
    startDownloadManager()
  }

  return taskId
}

/** Удалить скачанный эпизод (файлы + store) */
export async function deleteDownloadedEpisode(episodeId: string): Promise<void> {
  const store = useDownloadsStore.getState()
  const episode = store.downloaded[episodeId]

  if (!episode) {
    return
  }

  // Удаляем файлы
  const { deleteEpisodeFiles } = await import('./fileStorage')
  await deleteEpisodeFiles(episode.animeId, episode.episodeId)

  // Удаляем из store
  store.removeDownloaded(episodeId)
}
