/**
 * API: POST /api/user/library/sync — Синхронизация библиотеки Desktop → Tracker
 *
 * Desktop отправляет массив аниме из локальной библиотеки.
 * Трекер обновляет UserLibraryItem для каждого аниме (upsert по manifestCid).
 *
 * Аутентификация: API Key (Bearer).
 */

import { verifyApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/** Элемент библиотеки от Desktop */
interface SyncItem {
  /** CID директории (primary идентификатор) */
  directoryCid?: string
  /** @deprecated TODO: удалить после миграции всех клиентов на directoryCid */
  manifestCid?: string
  /** Shikimori ID */
  shikimoriId?: number
  /** Статус просмотра */
  watchStatus?: string
  /** Оценка пользователя */
  userRating?: number | null
  /** Запиннено локально */
  pinnedLocally?: boolean
  /** Время последнего обновления на клиенте (ISO string, для conflict resolution) */
  updatedAt?: string
  /** Прогресс по эпизодам */
  watchProgress?: Array<{
    episodeNumber: number
    currentTime: number
    completed: boolean
    /** Время последнего обновления прогресса на клиенте (ISO string) */
    updatedAt?: string
  }>
}

/** Элемент серверной стороны для bidirectional sync */
interface SyncServerItem {
  directoryCid: string | null
  /** Shikimori ID для матча при смене directoryCid */
  shikimoriId: number | null
  watchStatus: string
  userRating: number | null
  updatedAt: string
  watchProgress: Array<{
    episodeNumber: number
    currentTime: number
    completed: boolean
    updatedAt: string
  }>
}

const VALID_WATCH_STATUSES = ['NOT_STARTED', 'WATCHING', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'PLANNED'] as const

export async function POST(request: NextRequest) {
  // Аутентификация: API Key или сессия
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const user = apiKeyUser ?? session?.user

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Ожидается { items: SyncItem[] }' }, { status: 400 })
  }

  const items: SyncItem[] = body.items
  const syncedSince = body.syncedSince ? new Date(body.syncedSince as string) : undefined
  let synced = 0
  let skipped = 0

  // Батч: загружаем все аниме по CID и shikimoriId одним запросом вместо N+1
  const directoryCids = items.map((i) => i.directoryCid).filter(Boolean) as string[]
  const shikimoriIds = items.map((i) => i.shikimoriId).filter(Boolean) as number[]

  const [animeByDirCid, animeByShikimori, existingLibraryItems] = await Promise.all([
    directoryCids.length > 0
      ? prisma.anime.findMany({
          where: { directoryCid: { in: directoryCids } },
          select: { id: true, directoryCid: true },
        })
      : [],
    // Fallback по shikimoriId — нужен при смене directoryCid (обновление раздачи)
    shikimoriIds.length > 0
      ? prisma.anime.findMany({
          where: { shikimoriId: { in: shikimoriIds }, status: 'PUBLISHED' },
          select: { id: true, shikimoriId: true },
        })
      : [],
    prisma.userLibraryItem.findMany({
      where: { userId: user.id },
      select: { id: true, animeId: true, updatedAt: true },
    }),
  ])

  // Построение маппингов для O(1) lookup
  const dirCidToAnimeId = new Map(animeByDirCid.map((a) => [a.directoryCid!, a.id]))
  const shikimoriToAnimeId = new Map(animeByShikimori.map((a) => [a.shikimoriId!, a.id]))
  const libraryItemMap = new Map(existingLibraryItems.map((li) => [li.animeId, li]))

  for (const item of items) {
    if (!item.directoryCid && !item.shikimoriId) {
      skipped++
      continue
    }

    // O(1) lookup: directoryCid → shikimoriId (fallback при смене CID)
    const animeId =
      (item.directoryCid ? dirCidToAnimeId.get(item.directoryCid) : undefined) ??
      (item.shikimoriId ? shikimoriToAnimeId.get(item.shikimoriId) : undefined)

    if (!animeId) {
      skipped++
      continue
    }

    // O(1) lookup вместо DB запроса
    const existing = libraryItemMap.get(animeId)

    // Conflict resolution: если клиент передал updatedAt, пропускаем если серверная запись новее
    const clientUpdatedAt = item.updatedAt ? new Date(item.updatedAt) : null
    const shouldUpdateLibrary = !existing || !clientUpdatedAt || clientUpdatedAt >= existing.updatedAt

    // Upsert UserLibraryItem
    const watchStatus =
      item.watchStatus && VALID_WATCH_STATUSES.includes(item.watchStatus as (typeof VALID_WATCH_STATUSES)[number])
        ? (item.watchStatus as (typeof VALID_WATCH_STATUSES)[number])
        : 'NOT_STARTED'

    const libraryItem = shouldUpdateLibrary
      ? await prisma.userLibraryItem.upsert({
          where: {
            userId_animeId: {
              userId: user.id,
              animeId,
            },
          },
          create: {
            userId: user.id,
            animeId,
            watchStatus,
            userRating: item.userRating ?? null,
            pinnedLocally: item.pinnedLocally ?? false,
          },
          update: {
            watchStatus,
            userRating: item.userRating ?? null,
            pinnedLocally: item.pinnedLocally ?? false,
          },
        })
      : existing!

    // Синхронизация прогресса просмотра с conflict resolution
    if (item.watchProgress?.length) {
      for (const progress of item.watchProgress) {
        // Проверяем conflict resolution для каждого прогресса
        const progressClientUpdatedAt = progress.updatedAt ? new Date(progress.updatedAt) : null
        if (progressClientUpdatedAt) {
          const existingProgress = await prisma.userWatchProgress.findUnique({
            where: {
              libraryItemId_episodeNumber: {
                libraryItemId: libraryItem.id,
                episodeNumber: progress.episodeNumber,
              },
            },
            select: { updatedAt: true },
          })
          // Пропускаем если серверный прогресс новее
          if (existingProgress && progressClientUpdatedAt < existingProgress.updatedAt) {
            continue
          }
        }

        await prisma.userWatchProgress.upsert({
          where: {
            libraryItemId_episodeNumber: {
              libraryItemId: libraryItem.id,
              episodeNumber: progress.episodeNumber,
            },
          },
          create: {
            libraryItemId: libraryItem.id,
            episodeNumber: progress.episodeNumber,
            currentTime: progress.currentTime,
            completed: progress.completed,
          },
          update: {
            currentTime: progress.currentTime,
            completed: progress.completed,
          },
        })
      }
    }

    synced++
  }

  // Фаза 2: собрать serverItems — записи обновленные на сервере после syncedSince
  let serverItems: SyncServerItem[] = []

  if (syncedSince) {
    const updatedOnServer = await prisma.userLibraryItem.findMany({
      where: {
        userId: user.id,
        OR: [{ updatedAt: { gt: syncedSince } }, { watchProgress: { some: { updatedAt: { gt: syncedSince } } } }],
      },
      include: {
        anime: { select: { directoryCid: true, shikimoriId: true } },
        watchProgress: {
          where: syncedSince ? { updatedAt: { gt: syncedSince } } : undefined,
          select: {
            episodeNumber: true,
            currentTime: true,
            completed: true,
            updatedAt: true,
          },
        },
      },
    })

    serverItems = updatedOnServer.map((item) => ({
      directoryCid: item.anime.directoryCid,
      shikimoriId: item.anime.shikimoriId,
      watchStatus: item.watchStatus,
      userRating: item.userRating,
      updatedAt: item.updatedAt.toISOString(),
      watchProgress: item.watchProgress.map((wp) => ({
        episodeNumber: wp.episodeNumber,
        currentTime: wp.currentTime,
        completed: wp.completed,
        updatedAt: wp.updatedAt.toISOString(),
      })),
    }))
  }

  return NextResponse.json({
    success: true,
    synced,
    skipped,
    total: items.length,
    serverItems,
  })
}
