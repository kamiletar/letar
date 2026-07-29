/**
 * Progress API routes для Mobile Server
 *
 * GET /api/progress/:episodeId — получить прогресс просмотра
 * POST /api/progress/:episodeId — сохранить прогресс просмотра
 */

import type { IncomingMessage, ServerResponse } from 'http'

import { withDbRetry } from '../../../utils/db-retry'
import { createModuleLogger } from '../../../utils/logger'
import { getDb } from '../../database'
import { getTrackerSyncService } from '../../tracker-sync'
import { mobileProgressEvents } from '../progress-events'
import type { MobileWatchProgress } from '../types'

const log = createModuleLogger('MobileProgress')

/**
 * Обработчик запросов прогресса
 */
export async function handleProgressRequest(
  req: IncomingMessage,
  res: ServerResponse,
  episodeId: string,
): Promise<void> {
  const db = getDb()

  try {
    if (req.method === 'GET') {
      await handleGetProgress(res, db, episodeId)
    } else if (req.method === 'POST') {
      await handleSaveProgress(req, res, db, episodeId)
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Method not allowed' }))
    }
  } catch (error) {
    log.error('Progress request error', { episodeId, error: String(error) })
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}

/**
 * Получить прогресс просмотра эпизода
 */
async function handleGetProgress(res: ServerResponse, db: ReturnType<typeof getDb>, episodeId: string): Promise<void> {
  // Сначала найдём эпизод чтобы получить animeId
  const episode = await db.episode.findUnique({
    where: { id: episodeId },
    select: { animeId: true },
  })

  if (!episode) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Episode not found' }))
    return
  }

  const progress = await db.watchProgress.findUnique({
    where: {
      animeId_episodeId: {
        animeId: episode.animeId,
        episodeId,
      },
    },
  })

  if (!progress) {
    // Нет прогресса — возвращаем null
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(null))
    return
  }

  const response: MobileWatchProgress = {
    currentTime: progress.currentTime,
    completed: progress.completed,
    lastWatchedAt: progress.lastWatchedAt.toISOString(),
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(response))
}

/**
 * Сохранить прогресс просмотра
 */
async function handleSaveProgress(
  req: IncomingMessage,
  res: ServerResponse,
  db: ReturnType<typeof getDb>,
  episodeId: string,
): Promise<void> {
  // Парсим body
  const body = await parseBody(req)
  if (!body) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return
  }

  const { currentTime, completed } = body as { currentTime?: number; completed?: boolean }

  if (typeof currentTime !== 'number') {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'currentTime is required' }))
    return
  }

  // Получаем эпизод с animeId
  const episode = await db.episode.findUnique({
    where: { id: episodeId },
    select: { animeId: true, durationMs: true, number: true },
  })

  if (!episode) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Episode not found' }))
    return
  }

  // Определяем completed автоматически если не передано
  // Если посмотрели более 90% — считаем завершённым
  let isCompleted = completed ?? false
  if (episode.durationMs && !isCompleted) {
    const durationSec = episode.durationMs / 1000
    isCompleted = currentTime >= durationSec * 0.9
  }

  // Upsert прогресса (с retry при блокировке БД импортом)
  const progress = await withDbRetry(
    () =>
      db.watchProgress.upsert({
        where: {
          animeId_episodeId: {
            animeId: episode.animeId,
            episodeId,
          },
        },
        create: {
          animeId: episode.animeId,
          episodeId,
          currentTime,
          completed: isCompleted,
          lastWatchedAt: new Date(),
        },
        update: {
          currentTime,
          completed: isCompleted,
          lastWatchedAt: new Date(),
        },
      }),
    { context: 'mobile:saveProgress' },
  )

  // Обновляем статус просмотра аниме если эпизод завершён
  if (isCompleted) {
    await withDbRetry(() => updateAnimeWatchStatus(db, episode.animeId), {
      context: 'mobile:updateWatchStatus',
    })
  }

  log.debug('Progress saved', {
    episodeId,
    currentTime,
    completed: isCompleted,
  })

  // Уведомляем renderer через IPC об обновлении прогресса с мобильного
  mobileProgressEvents.emit('saved', { animeId: episode.animeId, episodeId })

  // Пробрасываем прогресс на трекер (fire-and-forget) — без этого прогресс,
  // сохранённый через мобильный/TV-клиент, улетает на трекер только с 5-минутным
  // полным sync (или не улетает вовсе, если Desktop выключат раньше)
  getTrackerSyncService().pushWatchProgressImmediate({
    animeId: episode.animeId,
    episodeNumber: episode.number,
    currentTime,
    duration: episode.durationMs ? episode.durationMs / 1000 : 0,
    completed: isCompleted,
  })

  const response: MobileWatchProgress = {
    currentTime: progress.currentTime,
    completed: progress.completed,
    lastWatchedAt: progress.lastWatchedAt.toISOString(),
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(response))
}

/**
 * Обновить статус просмотра аниме на основе прогресса эпизодов
 */
async function updateAnimeWatchStatus(db: ReturnType<typeof getDb>, animeId: string): Promise<void> {
  const anime = await db.anime.findUnique({
    where: { id: animeId },
    select: {
      episodeCount: true,
      watchStatus: true,
      _count: {
        select: {
          watchProgress: {
            where: { completed: true },
          },
        },
      },
    },
  })

  if (!anime) {
    return
  }

  const completedCount = anime._count.watchProgress
  const totalEpisodes = anime.episodeCount

  // Если все эпизоды просмотрены — статус COMPLETED
  if (totalEpisodes > 0 && completedCount >= totalEpisodes) {
    await db.anime.update({
      where: { id: animeId },
      data: {
        watchStatus: 'COMPLETED',
        watchedAt: new Date(),
      },
    })
  } else if (completedCount > 0 && anime.watchStatus === 'NOT_STARTED') {
    // Если есть прогресс но статус NOT_STARTED — меняем на WATCHING
    await db.anime.update({
      where: { id: animeId },
      data: { watchStatus: 'WATCHING' },
    })
  }
}

/**
 * Парсинг JSON body из запроса
 */
async function parseBody(req: IncomingMessage): Promise<unknown | null> {
  return new Promise((resolve) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        resolve(JSON.parse(body))
      } catch {
        resolve(null)
      }
    })

    req.on('error', () => {
      resolve(null)
    })
  })
}

/**
 * Получить последний просмотренный эпизод
 * GET /api/last-watched
 */
export async function handleLastWatchedRequest(res: ServerResponse): Promise<void> {
  const db = getDb()

  try {
    // Находим последний прогресс (не завершённый) с сортировкой по времени
    const lastProgress = await db.watchProgress.findFirst({
      where: {
        completed: false,
        currentTime: { gt: 0 }, // Только если есть прогресс
      },
      orderBy: {
        lastWatchedAt: 'desc',
      },
      include: {
        anime: {
          select: {
            id: true,
            name: true,
            posterCid: true,
            poster: { select: { cid: true } },
          },
        },
        episode: {
          select: {
            id: true,
            number: true,
            name: true,
            durationMs: true,
            transcodedCid: true,
            folderPath: true,
          },
        },
      },
    })

    // Если нет незавершённого — ищем последний завершённый с несмотренными эпизодами
    if (!lastProgress) {
      // Ищем аниме с незавершёнными эпизодами
      const animeWithProgress = await db.anime.findFirst({
        where: {
          watchStatus: 'WATCHING',
        },
        orderBy: {
          watchProgress: {
            _count: 'desc',
          },
        },
        select: {
          id: true,
          name: true,
          posterCid: true,
          poster: { select: { cid: true } },
          episodes: {
            where: {
              OR: [{ transcodedCid: { not: null } }, { folderPath: { not: null } }],
            },
            orderBy: { number: 'asc' },
            take: 1,
            select: {
              id: true,
              number: true,
              name: true,
              durationMs: true,
            },
          },
        },
      })

      if (!animeWithProgress || animeWithProgress.episodes.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'No last watched found' }))
        return
      }

      // Возвращаем первый непросмотренный эпизод
      const episode = animeWithProgress.episodes[0]
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          anime: {
            id: animeWithProgress.id,
            name: animeWithProgress.name,
            posterCid: animeWithProgress.poster?.cid ?? animeWithProgress.posterCid ?? null,
          },
          episode: {
            id: episode.id,
            number: episode.number,
            name: episode.name,
            durationMs: episode.durationMs,
          },
          progress: {
            currentTime: 0,
            completed: false,
            lastWatchedAt: new Date().toISOString(),
          },
        }),
      )
      return
    }

    // Проверяем, что эпизод можно воспроизводить
    if (!lastProgress.episode.transcodedCid && !lastProgress.episode.folderPath) {
      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Episode video not available' }))
      return
    }

    const response = {
      anime: {
        id: lastProgress.anime.id,
        name: lastProgress.anime.name,
        posterCid: lastProgress.anime.poster?.cid ?? lastProgress.anime.posterCid ?? null,
      },
      episode: {
        id: lastProgress.episode.id,
        number: lastProgress.episode.number,
        name: lastProgress.episode.name,
        durationMs: lastProgress.episode.durationMs,
      },
      progress: {
        currentTime: lastProgress.currentTime,
        completed: lastProgress.completed,
        lastWatchedAt: lastProgress.lastWatchedAt.toISOString(),
      },
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response))
  } catch (error) {
    log.error('Last watched request error', { error: String(error) })
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}
