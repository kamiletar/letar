/**
 * Сервис перекодировки аудиодорожек аниме
 *
 * Скачивает дорожки из IPFS, перекодирует в целевой битрейт,
 * загружает обратно и обновляет БД + манифесты.
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import { transcodeAudio } from '../ffmpeg/transcode'
import { prisma } from '../utils/db'
import { createModuleLogger } from '../utils/logger'
import { regenerateAnimeEpisodeManifests } from './episode-manifest-regen'
import { addFile, saveToFile } from './ipfs/unixfs-service'

import type {
  BatchReencodePreview,
  BatchReencodeProgress,
  BatchReencodeResult,
  ReencodePreview,
  ReencodeProgress,
  ReencodeResult,
  ReencodeTrackProgress,
} from '../../shared/types/audio-reencode'

export type {
  BatchReencodePreview,
  BatchReencodeProgress,
  BatchReencodeResult,
  ReencodePreview,
  ReencodeProgress,
  ReencodeResult,
  ReencodeTrackProgress,
}

const log = createModuleLogger('AudioReencode')

/** Парсинг строки каналов в число */
function parseChannels(channels: string | null): number {
  if (!channels) {
    return 2
  }
  // "5.1" → 6, "2.0" → 2, "7.1" → 8, "1.0" → 1, "5.1 (side)" → 6
  const match = channels.match(/^(\d+)\.(\d+)/)
  if (match) {
    return Number.parseInt(match[1]) + Number.parseInt(match[2])
  }
  const num = Number.parseInt(channels)
  return Number.isNaN(num) ? 2 : num
}

/** Формирование заголовка дорожки */
function buildTrackTitle(track: {
  language: string | null
  title: string | null
  channels: string | null
  dubGroup: string | null
}): string {
  const parts: string[] = []
  // Предпочитаем dubGroup (название озвучки), потом title
  if (track.dubGroup) {
    parts.push(track.dubGroup)
  } else if (track.title) {
    parts.push(track.title)
  } else if (track.language) {
    const langMap: Record<string, string> = { rus: 'Русский', jpn: 'Японский', eng: 'Английский', und: 'Неизвестный' }
    parts.push(langMap[track.language] ?? track.language)
  }
  // Добавляем channels только если основная часть ещё не содержит его
  if (track.channels && !parts.some((p) => p.includes(track.channels!))) {
    parts.push(track.channels)
  }
  return parts.join(' ') || 'Аудио'
}

/**
 * Оценка размера файла при заданном битрейте
 * @returns размер в байтах или null если длительность неизвестна
 */
function estimateFileSize(durationMs: number | null, bitrateKbps: number): number | null {
  if (!durationMs || durationMs <= 0) {
    return null
  }
  // размер = длительность_сек * битрейт_бит/с / 8 + ~5% оверхед контейнера
  return Math.round((durationMs / 1000) * ((bitrateKbps * 1000) / 8) * 1.05)
}

/**
 * Нужно ли пережимать дорожку?
 * Сравнивает реальный размер файла с ожидаемым при целевом битрейте.
 * Пережимаем если файл на 15%+ больше ожидаемого.
 */
function needsReencode(ipfsSize: number | null, durationMs: number | null, targetBitrateKbps: number): boolean {
  if (!ipfsSize || ipfsSize <= 0) {
    return false
  } // нет файла — нечего пережимать
  const expectedSize = estimateFileSize(durationMs, targetBitrateKbps)
  if (!expectedSize) {
    return false
  } // неизвестная длительность — нечем оценить, пропускаем
  // Пережимаем если реальный размер больше ожидаемого на 15%+
  return ipfsSize > expectedSize * 1.15
}

/**
 * Предпросмотр: список дорожек для перекодировки
 */
export async function previewReencode(animeId: string, targetBitrateKbps: number): Promise<ReencodePreview> {
  // Получаем все дорожки с transcodedCid + длительность эпизода
  const allTracks = await prisma.audioTrack.findMany({
    where: {
      episode: { animeId },
      transcodedCid: { not: null },
    },
    select: {
      id: true,
      language: true,
      title: true,
      channels: true,
      bitrate: true,
      ipfsSize: true,
      dubGroup: true,
      episode: { select: { number: true, durationMs: true } },
    },
    orderBy: [{ episode: { number: 'asc' } }, { streamIndex: 'asc' }],
  })

  // Фильтруем: пережимаем только если ipfsSize > ожидаемого при целевом битрейте (+10% запас)
  // Ожидаемый размер = (durationMs / 1000) * (targetBitrate * 1000 / 8)
  const tracks = allTracks.filter((t) => needsReencode(t.ipfsSize, t.episode.durationMs, targetBitrateKbps))

  const totalSize = tracks.reduce((sum, t) => sum + (t.ipfsSize ?? 0), 0)
  // Оценка: разница между текущим размером и ожидаемым при целевом битрейте
  const estimatedSaving = tracks.reduce((sum, t) => {
    const expectedSize = estimateFileSize(t.episode.durationMs, targetBitrateKbps)
    if (!t.ipfsSize || !expectedSize) {
      return sum
    }
    return sum + Math.max(0, t.ipfsSize - expectedSize)
  }, 0)

  return {
    tracks: tracks.map((t) => ({
      id: t.id,
      title: buildTrackTitle(t),
      episodeNumber: t.episode.number,
      bitrate: t.bitrate,
      ipfsSize: t.ipfsSize,
      channels: t.channels,
    })),
    totalSize,
    estimatedSaving,
  }
}

/**
 * Перекодировка всех подходящих аудиодорожек аниме
 */
export async function reencodeAnimeAudio(
  animeId: string,
  targetBitrateKbps: number,
  onProgress?: (progress: ReencodeProgress) => void,
  cancelToken?: { cancelled: boolean },
): Promise<ReencodeResult> {
  const targetBitrateBps = targetBitrateKbps * 1000
  // Уникальная temp-директория для каждого аниме — избегаем race condition при пакетной обработке
  const tempDir = path.join(app.getPath('temp'), `animatrona-reencode-${animeId}`)
  await fs.promises.mkdir(tempDir, { recursive: true })

  // Запрос дорожек + фильтрация по размеру
  const allTracks = await prisma.audioTrack.findMany({
    where: {
      episode: { animeId },
      transcodedCid: { not: null },
    },
    select: {
      id: true,
      language: true,
      title: true,
      channels: true,
      bitrate: true,
      ipfsSize: true,
      dubGroup: true,
      transcodedCid: true,
      episode: { select: { id: true, number: true, durationMs: true } },
    },
    orderBy: [{ episode: { number: 'asc' } }, { streamIndex: 'asc' }],
  })

  const dbTracks = allTracks.filter((t) => needsReencode(t.ipfsSize, t.episode.durationMs, targetBitrateKbps))

  if (dbTracks.length === 0) {
    return { reencoded: 0, skipped: 0, failed: 0, savedBytes: 0 }
  }

  log.info('Начинаем перекодировку', { animeId, tracks: dbTracks.length, targetBitrateKbps })

  // Инициализация прогресса
  const trackProgresses: ReencodeTrackProgress[] = dbTracks.map((t) => ({
    trackId: t.id,
    trackTitle: buildTrackTitle(t),
    episodeNumber: t.episode.number,
    status: 'pending' as const,
    percent: 0,
  }))

  const progress: ReencodeProgress = {
    tracks: trackProgresses,
    currentTrackIndex: 0,
    completedTracks: 0,
    totalTracks: dbTracks.length,
    savedBytes: 0,
  }

  const emit = () => onProgress?.({ ...progress, tracks: [...progress.tracks] })

  let reencoded = 0
  let failed = 0

  /** Обработка одной дорожки */
  const processTrack = async (i: number) => {
    if (cancelToken?.cancelled) {
      return
    }

    const track = dbTracks[i]
    const tp = trackProgresses[i]

    const tempInput = path.join(tempDir, `input_${i}.m4a`)
    const tempOutput = path.join(tempDir, `output_${i}.m4a`)

    try {
      // === Скачивание из IPFS ===
      tp.status = 'downloading'
      tp.percent = 0
      emit()

      await saveToFile(track.transcodedCid!, tempInput)
      tp.percent = 100
      emit()

      if (cancelToken?.cancelled) {
        return
      }

      // === Транскодирование ===
      tp.status = 'transcoding'
      tp.percent = 0
      emit()

      await transcodeAudio(
        tempInput,
        tempOutput,
        {
          bitrate: targetBitrateKbps,
          sampleRate: 48000,
          channels: parseChannels(track.channels),
        },
        (ffProgress) => {
          tp.percent = Math.round(ffProgress.percent)
          emit()
        },
      )

      if (cancelToken?.cancelled) {
        return
      }

      // === Загрузка в IPFS ===
      tp.status = 'uploading'
      tp.percent = 0
      emit()

      const result = await addFile(tempOutput)
      tp.percent = 100
      emit()

      // === Обновление БД ===
      const oldSize = track.ipfsSize ?? 0
      const newSize = result.size
      const saved = oldSize - newSize

      await prisma.audioTrack.update({
        where: { id: track.id },
        data: {
          transcodedCid: result.cid,
          ipfsSize: newSize,
          bitrate: targetBitrateBps,
        },
      })

      tp.status = 'done'
      tp.savedBytes = saved
      progress.savedBytes += Math.max(0, saved)
      progress.completedTracks++
      reencoded++
      emit()

      log.info('Дорожка перекодирована', {
        trackId: track.id,
        episode: track.episode.number,
        oldSize,
        newSize,
        saved,
      })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      tp.status = 'error'
      tp.error = errMsg
      progress.completedTracks++
      failed++
      emit()

      log.error('Ошибка перекодировки дорожки', { trackId: track.id, error: errMsg })
    } finally {
      // Удаляем temp файлы
      for (const f of [tempInput, tempOutput]) {
        fs.promises.unlink(f).catch(() => {})
      }
    }
  }

  // Параллельный пул: 4 потока
  const CONCURRENCY = 4
  let nextIndex = 0
  const runWorker = async () => {
    while (nextIndex < dbTracks.length) {
      if (cancelToken?.cancelled) {
        break
      }
      const idx = nextIndex++
      await processTrack(idx)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, dbTracks.length) }, () => runWorker()))

  if (cancelToken?.cancelled) {
    log.info('Перекодировка отменена пользователем')
  }

  // Пересчитываем манифесты
  if (reencoded > 0) {
    try {
      log.info('Регенерация манифестов', { animeId })
      await regenerateAnimeEpisodeManifests(animeId)
    } catch (err) {
      log.error('Ошибка регенерации манифестов', { error: String(err) })
    }
  }

  // Удаляем temp директорию
  fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {})

  const result: ReencodeResult = {
    reencoded,
    skipped: 0,
    failed,
    savedBytes: progress.savedBytes,
  }

  log.info('Перекодировка завершена', result)
  return result
}

// === Пакетная перекодировка ===

/** Получение целевого битрейта из настроек */
async function getTargetBitrate(): Promise<number> {
  const settings = await prisma.settings.findFirst({ select: { audioBitrate: true } })
  return settings?.audioBitrate ?? 192
}

/**
 * Предпросмотр пакетной перекодировки: список аниме с дорожками для пережатия
 */
export async function previewBatchReencode(): Promise<BatchReencodePreview> {
  const targetBitrateKbps = await getTargetBitrate()

  // Все аудиодорожки с transcodedCid, сгруппированные по аниме
  const allTracks = await prisma.audioTrack.findMany({
    where: { transcodedCid: { not: null } },
    select: {
      id: true,
      ipfsSize: true,
      episode: {
        select: {
          durationMs: true,
          anime: { select: { id: true, name: true } },
        },
      },
    },
  })

  // Группируем по аниме, фильтруем через needsReencode
  const animeMap = new Map<string, { name: string; trackCount: number; totalSize: number; estimatedSaving: number }>()

  for (const track of allTracks) {
    if (!needsReencode(track.ipfsSize, track.episode.durationMs, targetBitrateKbps)) {
      continue
    }

    const animeId = track.episode.anime.id
    const existing = animeMap.get(animeId)
    const trackSize = track.ipfsSize ?? 0
    const expectedSize = estimateFileSize(track.episode.durationMs, targetBitrateKbps) ?? 0
    const saving = Math.max(0, trackSize - expectedSize)

    if (existing) {
      existing.trackCount++
      existing.totalSize += trackSize
      existing.estimatedSaving += saving
    } else {
      animeMap.set(animeId, {
        name: track.episode.anime.name,
        trackCount: 1,
        totalSize: trackSize,
        estimatedSaving: saving,
      })
    }
  }

  const animes = Array.from(animeMap.entries()).map(([id, info]) => ({ id, ...info }))
  // Сортировка по имени
  animes.sort((a, b) => a.name.localeCompare(b.name))

  return {
    animes,
    totalTracks: animes.reduce((sum, a) => sum + a.trackCount, 0),
    totalSize: animes.reduce((sum, a) => sum + a.totalSize, 0),
    totalEstimatedSaving: animes.reduce((sum, a) => sum + a.estimatedSaving, 0),
  }
}

/**
 * Пакетная перекодировка аудио во всех аниме, где есть дорожки для пережатия
 */
export async function batchReencodeAudio(
  onProgress?: (progress: BatchReencodeProgress) => void,
  cancelToken?: { cancelled: boolean },
): Promise<BatchReencodeResult> {
  const targetBitrateKbps = await getTargetBitrate()

  // Получаем preview чтобы узнать список аниме
  const preview = await previewBatchReencode()

  if (preview.animes.length === 0) {
    return { totalReencoded: 0, totalFailed: 0, totalSavedBytes: 0, animeResults: [] }
  }

  log.info('Начинаем пакетную перекодировку', {
    animes: preview.animes.length,
    totalTracks: preview.totalTracks,
    targetBitrateKbps,
  })

  const progress: BatchReencodeProgress = {
    currentAnimeIndex: 0,
    totalAnimes: preview.animes.length,
    currentAnimeName: '',
    completedAnimes: 0,
    trackProgress: null,
    totalSavedBytes: 0,
  }

  const emit = () => onProgress?.({ ...progress })

  const animeResults: BatchReencodeResult['animeResults'] = []
  let totalReencoded = 0
  let totalFailed = 0

  for (let i = 0; i < preview.animes.length; i++) {
    if (cancelToken?.cancelled) {
      break
    }

    const anime = preview.animes[i]
    progress.currentAnimeIndex = i
    progress.currentAnimeName = anime.name
    progress.trackProgress = null
    emit()

    try {
      const result = await reencodeAnimeAudio(
        anime.id,
        targetBitrateKbps,
        (trackProgress) => {
          progress.trackProgress = trackProgress
          emit()
        },
        cancelToken,
      )

      totalReencoded += result.reencoded
      totalFailed += result.failed
      progress.totalSavedBytes += result.savedBytes
      animeResults.push({ animeId: anime.id, animeName: anime.name, result })
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      log.error('Ошибка пакетной перекодировки аниме', { animeId: anime.id, error: errMsg })
      totalFailed += anime.trackCount
      animeResults.push({
        animeId: anime.id,
        animeName: anime.name,
        result: { reencoded: 0, skipped: 0, failed: anime.trackCount, savedBytes: 0 },
      })
    }

    progress.completedAnimes = i + 1
    emit()
  }

  if (cancelToken?.cancelled) {
    log.info('Пакетная перекодировка отменена пользователем')
  }

  const result: BatchReencodeResult = {
    totalReencoded,
    totalFailed,
    totalSavedBytes: progress.totalSavedBytes,
    animeResults,
  }

  log.info('Пакетная перекодировка завершена', result)
  return result
}
