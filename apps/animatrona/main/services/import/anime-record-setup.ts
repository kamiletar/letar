/**
 * Подготовка записи аниме перед импортом файлов:
 * профиль кодирования, постер, Anime/Season в БД, жанры, внешние субтитры.
 *
 * Выделено из import-service.ts — эти функции не используют состояние ImportService,
 * принимают все данные явными аргументами.
 */

import fs from 'fs'

import type { ImportQueueEntry } from '../../../shared/types/import-queue'
import { createModuleLogger } from '../../utils/logger'
import { type ExternalSubtitleMatch, scanForExternalSubtitles } from '../external-subtitle-scanner'
import { downloadPoster } from '../shikimori/client'
import { getPosterUrl, mapSeasonType, mapShikimoriStatus } from './helpers'
import * as db from './import-db'
import { uploadToIpfs } from './import-ipfs'

const log = createModuleLogger('ImportService')

export async function loadEncodingProfile(profileId?: string | null) {
  try {
    if (profileId) {
      const profile = await db.findEncodingProfile(profileId)
      if (profile) {
        return profile
      }
    }
    return await db.getDefaultEncodingProfile()
  } catch (error) {
    log.warn('Не удалось загрузить профиль', { error: String(error) })
    return null
  }
}

export async function downloadAndSavePoster(
  selectedAnime: ImportQueueEntry['selectedAnime'],
  folderPath: string,
): Promise<string | undefined> {
  try {
    // Проверяем, есть ли постер у аниме с таким же shikimoriId (из предыдущего импорта)
    const shikimoriId = Number.parseInt(selectedAnime.id, 10)
    if (!Number.isNaN(shikimoriId)) {
      const existingAnime = await db.findAnimeByShikimoriId(shikimoriId)
      if (existingAnime?.posterId && existingAnime?.poster?.cid) {
        log.debug('Постер уже в IPFS, пропускаем скачивание', { shikimoriId, cid: existingAnime.poster.cid })
        return existingAnime.posterId
      }
    }

    const posterUrl = getPosterUrl(selectedAnime.posterUrl)
    if (!posterUrl) {
      return undefined
    }

    // Скачиваем постер с retry (Shikimori DDoS-Guard может блокировать первую попытку)
    let posterResult = await downloadPoster(posterUrl, selectedAnime.id, { savePath: folderPath })
    if (!posterResult) {
      log.info('Первая попытка скачивания постера не удалась, повторяем через 3сек', { posterUrl })
      await new Promise((resolve) => setTimeout(resolve, 3000))
      posterResult = await downloadPoster(posterUrl, selectedAnime.id, { savePath: folderPath })
    }
    if (!posterResult) {
      log.warn('Постер не скачан после 2 попыток', { posterUrl, animeId: selectedAnime.id })
      return undefined
    }

    // Загружаем постер в IPFS
    const ipfsResult = await uploadToIpfs(posterResult.localPath)
    const posterCid = ipfsResult?.cid
    if (!posterCid) {
      log.warn('Постер скачан, но IPFS upload вернул null — файл сохранён без CID', {
        localPath: posterResult.localPath,
        animeId: selectedAnime.id,
      })
    }

    const fileResult = await db.upsertFile({
      filename: posterResult.filename ?? `${selectedAnime.id}.jpg`,
      mimeType: posterResult.mimeType ?? 'image/jpeg',
      size: posterResult.size ?? 0,
      width: posterResult.width,
      height: posterResult.height,
      blurDataURL: posterResult.blurDataURL,
      category: 'POSTER',
      source: 'shikimori',
      cid: posterCid ?? undefined,
    })

    // Удаляем локальный файл
    if (posterCid) {
      try {
        fs.unlinkSync(posterResult.localPath)
      } catch {
        /* не критично */
      }
    }

    return fileResult.id
  } catch (error) {
    log.warn('Скачивание постера не удалось, продолжаем без постера', { error: String(error) })
    return undefined
  }
}

export async function createAnimeRecord(
  selectedAnime: ImportQueueEntry['selectedAnime'],
  parsedInfo: ImportQueueEntry['parsedInfo'],
  folderPath: string,
  posterId?: string,
): Promise<string> {
  const animeResult = await db.upsertAnime({
    name: selectedAnime.russian ?? selectedAnime.name,
    originalName: selectedAnime.name,
    nameEn: null,
    year: selectedAnime.airedOn ? parseInt(selectedAnime.airedOn.split('-')[0]) : null,
    status: mapShikimoriStatus(selectedAnime.status ?? 'released'),
    shikimoriId: parseInt(selectedAnime.id, 10),
    posterId,
    folderPath,
    episodeCount: selectedAnime.episodes ?? 0,
    isBdRemux: parsedInfo.isBdRemux,
    rutrackerUrl: parsedInfo.rutrackerUrl ?? null,
    sourceTorrentCid: parsedInfo.sourceTorrentCid ?? null,
  })
  return animeResult.id
}

export async function createSeasonRecord(
  animeId: string,
  selectedAnime: ImportQueueEntry['selectedAnime'],
  parsedInfo: ImportQueueEntry['parsedInfo'],
): Promise<string> {
  const seasonNum = parsedInfo.seasonNumber ?? 1
  const result = await db.upsertSeason({
    animeId,
    number: seasonNum,
    name: `Сезон ${seasonNum}`,
    type: mapSeasonType(selectedAnime.kind ?? null),
  })
  return result.id
}

export async function saveGenresIfAvailable(
  animeId: string,
  selectedAnime: ImportQueueEntry['selectedAnime'],
): Promise<void> {
  // selectedAnime может содержать genres из расширенных данных Shikimori
  const extAnime = selectedAnime as { genres?: Array<{ id: number; name: string; russian: string; kind?: string }> }
  if (!extAnime.genres?.length) {
    return
  }

  try {
    await db.saveGenresAndThemes(
      animeId,
      extAnime.genres.map((g) => ({
        id: g.id,
        name: g.name,
        russian: g.russian,
        kind: g.kind ?? 'genre',
      })),
    )
  } catch (err) {
    log.warn('Не удалось сохранить жанры', { error: String(err) })
  }
}

export async function scanExternalSubs(
  folderPath: string,
  selectedFiles: Array<{ path: string; episodeNumber: number }>,
): Promise<Map<number, ExternalSubtitleMatch[]>> {
  try {
    const result = await scanForExternalSubtitles(
      folderPath,
      selectedFiles.map((f) => ({ path: f.path, episodeNumber: f.episodeNumber })),
    )

    // scanForExternalSubtitles возвращает { subtitles[] }, группируем в Map по episodeNumber
    const map = new Map<number, ExternalSubtitleMatch[]>()
    for (const sub of result.subtitles) {
      if (sub.episodeNumber == null) {
        continue
      }
      const existing = map.get(sub.episodeNumber) ?? []
      existing.push(sub)
      map.set(sub.episodeNumber, existing)
    }
    log.debug('Внешние субтитры сгруппированы', {
      totalMatched: result.subtitles.length,
      episodes: map.size,
      unmatched: result.unmatchedFiles.length,
    })
    return map
  } catch (error) {
    log.warn('Не удалось сканировать внешние субтитры', { error: String(error) })
    return new Map()
  }
}
