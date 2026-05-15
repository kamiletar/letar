import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/admin/pinned
 * Список запиненных аниме (уникальные аниме со статусом PINNED)
 *
 * Группирует pin jobs по animeId, показывает на каких серверах запинено.
 */
export async function GET(_request: NextRequest) {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { db } = auth

  // Находим все PINNED задания с аниме
  const pinnedJobs = await db.pinJob.findMany({
    where: { status: 'PINNED', animeId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      cid: true,
      size: true,
      createdAt: true,
      server: { select: { id: true, name: true, status: true } },
      anime: {
        select: {
          id: true,
          title: true,
          coverUrl: true,
          shikimoriId: true,
          directorySize: true,
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  })

  // Группируем по animeId
  const animeMap = new Map<
    string,
    {
      anime: { id: string; title: string; coverUrl: string | null; shikimoriId: number | null }
      totalSize: number
      servers: Array<{ id: string; name: string; status: string }>
      pinnedAt: Date
      cidCount: number
      createdBy: { id: string; name: string | null }
    }
  >()

  for (const job of pinnedJobs) {
    if (!job.anime) {
      continue
    }
    const existing = animeMap.get(job.anime.id)
    if (existing) {
      existing.cidCount += 1
      // Добавляем сервер если ещё нет
      if (!existing.servers.some((s) => s.id === job.server.id)) {
        existing.servers.push(job.server)
      }
    } else {
      // Используем directorySize аниме (реальный размер директории), fallback на job.size
      const animeSize = job.anime.directorySize ? Number(job.anime.directorySize) : Number(job.size)
      animeMap.set(job.anime.id, {
        anime: {
          id: job.anime.id,
          title: job.anime.title,
          coverUrl: job.anime.coverUrl,
          shikimoriId: job.anime.shikimoriId,
        },
        totalSize: animeSize,
        servers: [job.server],
        pinnedAt: job.createdAt,
        cidCount: 1,
        createdBy: job.createdBy,
      })
    }
  }

  const items = Array.from(animeMap.values()).sort(
    (a, b) => new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime()
  )

  return NextResponse.json({ data: items, total: items.length })
}
