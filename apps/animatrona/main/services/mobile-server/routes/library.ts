/**
 * Library API routes для Mobile Server
 *
 * GET /api/library — список аниме
 * GET /api/library/:animeId — детали аниме с эпизодами
 * GET /api/poster/:animeId — постер аниме
 */

import { existsSync, readdirSync } from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import path from 'path'
import { Readable } from 'stream'

import type { ChaptersDocument, EpisodeManifest, ManifestChapter } from '../../../../shared/types/manifest'
import { getIpfsUrl } from '../../../utils/ipfs-url'
import { createModuleLogger } from '../../../utils/logger'
import { getDb } from '../../database'
import { cat } from '../../ipfs/unixfs-service'
import type {
  ChapterType,
  MobileAnime,
  MobileAudioTrack,
  MobileChapter,
  MobileEpisode,
  MobileSubtitleTrack,
} from '../types'

const log = createModuleLogger('MobileLibrary')

/** Конвертация lowercase ManifestChapterType → UPPERCASE MobileChapterType */
const MANIFEST_TO_MOBILE_TYPE: Record<string, ChapterType> = {
  op: 'OP',
  ed: 'ED',
  recap: 'RECAP',
  preview: 'PREVIEW',
  chapter: 'CHAPTER',
}

/** Загрузить главы из IPFS манифеста */
async function loadChaptersFromManifest(manifestCid: string | null | undefined): Promise<MobileChapter[]> {
  if (!manifestCid) {
    return []
  }

  try {
    const manifestBuf = await cat(manifestCid)
    const manifest: EpisodeManifest = JSON.parse(manifestBuf.toString('utf-8'))

    let chapters: ManifestChapter[] = []
    if (manifest.chaptersCid) {
      const chaptersBuf = await cat(manifest.chaptersCid)
      const chaptersDoc: ChaptersDocument = JSON.parse(chaptersBuf.toString('utf-8'))
      chapters = chaptersDoc.chapters
    } else if (manifest.chapters?.length) {
      // Обратная совместимость: inline главы в старых манифестах
      chapters = manifest.chapters
    }

    return chapters.map((ch, i) => ({
      id: `ch-${i}`,
      startMs: ch.startMs,
      endMs: ch.endMs,
      title: ch.title,
      type: MANIFEST_TO_MOBILE_TYPE[ch.type] ?? 'CHAPTER',
      skippable: ch.skippable,
    }))
  } catch (e) {
    log.debug('Не удалось загрузить главы из IPFS', { manifestCid, error: String(e) })
    return []
  }
}

type RouteAction = 'list' | 'details' | 'poster'

/**
 * Обработчик запросов к библиотеке
 */
export async function handleLibraryRequest(
  _req: IncomingMessage,
  res: ServerResponse,
  action: RouteAction,
  animeId?: string
): Promise<void> {
  const db = getDb()

  try {
    switch (action) {
      case 'list':
        await handleListAnime(res, db)
        break
      case 'details':
        if (!animeId) {
          sendError(res, 400, 'Missing animeId')
          return
        }
        await handleAnimeDetails(res, db, animeId)
        break
      case 'poster':
        if (!animeId) {
          sendError(res, 400, 'Missing animeId')
          return
        }
        await handleAnimePoster(res, db, animeId)
        break
    }
  } catch (error) {
    log.error('Library request error', { action, animeId, error: String(error) })
    sendError(res, 500, 'Internal server error')
  }
}

/**
 * Список аниме с базовой информацией
 */
async function handleListAnime(res: ServerResponse, db: ReturnType<typeof getDb>): Promise<void> {
  const animeList = await db.anime.findMany({
    include: {
      poster: { select: { cid: true } },
      watchProgress: {
        orderBy: { lastWatchedAt: 'desc' },
        take: 1,
      },
      episodes: {
        select: { id: true },
      },
      franchise: { select: { id: true, name: true, rootShikimoriId: true } },
      _count: {
        select: {
          watchProgress: {
            where: { completed: true },
          },
        },
      },
    },
    orderBy: [{ watchStatus: 'asc' }, { updatedAt: 'desc' }],
  })

  const response: MobileAnime[] = animeList.map((anime) => ({
    id: anime.id,
    name: anime.name,
    originalName: anime.originalName,
    year: anime.year,
    status: anime.status,
    episodeCount: anime.episodeCount,
    description: null,
    rating: anime.rating,
    posterPath: null,
    posterCid: anime.poster?.cid ?? anime.posterCid ?? null,
    watchStatus: anime.watchStatus,
    watchedEpisodes: anime._count.watchProgress,
    lastWatchedEpisode: anime.watchProgress[0] ? parseInt(anime.watchProgress[0].episodeId, 10) : null,
    shikimoriId: anime.shikimoriId,
    franchiseKey: anime.franchise?.id ?? null,
    franchiseName: anime.franchise?.name ?? null,
  }))

  sendJson(res, response)
}

/**
 * Детали аниме с сезонами и эпизодами
 */
async function handleAnimeDetails(res: ServerResponse, db: ReturnType<typeof getDb>, animeId: string): Promise<void> {
  const anime = await db.anime.findUnique({
    where: { id: animeId },
    include: {
      poster: { select: { cid: true, mimeType: true } },
      seasons: {
        orderBy: { number: 'asc' },
      },
      episodes: {
        include: {
          audioTracks: true,
          subtitleTracks: {
            include: { fonts: true },
          },
          watchProgress: true,
          season: true,
        },
        orderBy: { number: 'asc' },
      },
      genres: {
        include: { genre: true },
      },
    },
  })

  if (!anime) {
    sendError(res, 404, 'Anime not found')
    return
  }

  // Формируем эпизоды с путями к видео
  const settings = await db.settings.findUnique({ where: { id: 'default' } })
  const libraryPath = settings?.libraryPath

  const episodes: MobileEpisode[] = await Promise.all(
    anime.episodes.map(async (ep) => {
      // Видео: приоритет transcodedCid (IPFS), иначе ищем локальный файл
      let videoPath: string | null = null
      const videoCid: string | null = ep.transcodedCid ?? null

      // Если нет CID, ищем локальный файл
      if (!videoCid && libraryPath && ep.folderPath) {
        const episodePath = ep.folderPath
        if (existsSync(episodePath)) {
          const files = readdirSync(episodePath)
          const videoFile = files.find((f) =>
            ['.mkv', '.mp4', '.webm', '.avi'].some((ext) => f.toLowerCase().endsWith(ext))
          )
          if (videoFile) {
            videoPath = path.join(episodePath, videoFile)
          }
        }
      }

      const audioTracks: MobileAudioTrack[] = ep.audioTracks.map((at) => {
        // Вычисляем отображаемое имя: title || "Язык (dubGroup)" || язык
        const name =
          at.title ||
          (at.dubGroup ? `${at.language.toUpperCase()} (${at.dubGroup})` : null) ||
          at.language.toUpperCase()

        return {
          id: at.id,
          language: at.language,
          title: at.title,
          name,
          dubGroup: at.dubGroup,
          codec: at.codec,
          channels: at.channels,
          isDefault: at.isDefault,
          audioCid: at.transcodedCid ?? null,
        }
      })

      const subtitleTracks: MobileSubtitleTrack[] = ep.subtitleTracks.map((st) => {
        // Вычисляем отображаемое имя: title || "Язык (dubGroup)" || язык
        const name =
          st.title ||
          (st.dubGroup ? `${st.language.toUpperCase()} (${st.dubGroup})` : null) ||
          st.language.toUpperCase()

        return {
          id: st.id,
          language: st.language,
          title: st.title,
          name,
          dubGroup: st.dubGroup,
          format: st.format,
          isDefault: st.isDefault,
          fileCid: st.fileCid,
          fontCids:
            (st as { fonts?: { fileCid: string | null }[] }).fonts
              ?.filter((f) => f.fileCid)
              .map((f) => f.fileCid as string) ?? [],
        }
      })

      // Загружаем главы из IPFS манифеста
      const chapters = await loadChaptersFromManifest(ep.manifestCid)

      const progress = ep.watchProgress[0]

      return {
        id: ep.id,
        number: ep.number,
        name: ep.name,
        durationMs: ep.durationMs,
        seasonNumber: ep.season?.number ?? 1,
        seasonName: ep.season?.name ?? null,
        videoPath,
        videoCid,
        progress: progress
          ? {
              currentTime: progress.currentTime,
              completed: progress.completed,
              lastWatchedAt: progress.lastWatchedAt.toISOString(),
            }
          : null,
        audioTracks,
        subtitleTracks,
        chapters,
      }
    })
  )

  const response = {
    id: anime.id,
    name: anime.name,
    originalName: anime.originalName,
    year: anime.year,
    status: anime.status,
    episodeCount: anime.episodeCount,
    description: null,
    rating: anime.rating,
    posterPath: null,
    posterCid: anime.poster?.cid ?? anime.posterCid ?? null,
    watchStatus: anime.watchStatus,
    genres: anime.genres.map((g) => g.genre.name),
    seasons: anime.seasons.map((s) => ({
      number: s.number,
      name: s.name,
      type: s.type,
      episodeCount: s.episodeCount,
    })),
    episodes,
  }

  sendJson(res, response)
}

/**
 * Стриминг постера аниме
 * Приоритет: IPFS (по CID) → диск (фолбэк)
 */
async function handleAnimePoster(res: ServerResponse, db: ReturnType<typeof getDb>, animeId: string): Promise<void> {
  const anime = await db.anime.findUnique({
    where: { id: animeId },
    select: {
      posterCid: true,
      poster: { select: { cid: true, mimeType: true } },
    },
  })

  if (!anime) {
    sendError(res, 404, 'Anime not found')
    return
  }

  // IPFS (poster.cid или anime.posterCid)
  const cid = anime.poster?.cid ?? anime.posterCid
  if (!cid) {
    sendError(res, 404, 'Poster not found')
    return
  }

  try {
    const gatewayUrl = getIpfsUrl(cid)!
    const ipfsRes = await fetch(gatewayUrl, { signal: AbortSignal.timeout(5000) })
    if (ipfsRes.ok && ipfsRes.body) {
      const contentType = ipfsRes.headers.get('content-type') ?? anime.poster?.mimeType ?? 'image/jpeg'
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      })
      Readable.fromWeb(ipfsRes.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res)
      return
    }
    log.debug('IPFS gateway returned non-OK', { cid, status: ipfsRes.status })
    sendError(res, 502, 'IPFS gateway error')
  } catch (e) {
    log.debug('IPFS gateway not available', { cid, error: String(e) })
    sendError(res, 502, 'IPFS gateway unavailable')
  }
}

/** Отправить JSON ответ */
function sendJson(res: ServerResponse, data: unknown): void {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

/** Отправить ошибку */
function sendError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: message }))
}
