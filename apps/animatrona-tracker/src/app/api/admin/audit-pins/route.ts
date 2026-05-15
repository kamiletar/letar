/**
 * POST /api/admin/audit-pins — Аудит сиротских пинов (упрощённый dry-run)
 *
 * Сравнивает recursive pins на Kubo с directoryCid PUBLISHED аниме.
 * Для полного аудита с unpin используй POST /api/admin/audit-pins/run
 *
 * Query: ?serverId=xxx — аудит конкретного сервера (по умолчанию все)
 *
 * Только для ADMIN.
 */

import { isAuthError, requireAdmin } from '@/lib/admin-auth'
import { getKuboPins } from '@/lib/audit-pins-utils'
import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const { searchParams } = request.nextUrl
  const targetServerId = searchParams.get('serverId')

  // Получаем все актуальные directoryCid из PUBLISHED аниме
  const publishedAnime = await prisma.anime.findMany({
    where: { status: 'PUBLISHED', directoryCid: { not: null } },
    select: { directoryCid: true },
  })
  const activeCids = new Set(publishedAnime.map((a) => a.directoryCid!))

  // Получаем серверы
  const servers = await prisma.pinServer.findMany({
    where: targetServerId ? { id: targetServerId } : undefined,
    select: { id: true, name: true, apiUrl: true, authSecret: true },
  })

  const results: Array<{
    serverId: string
    serverName: string
    totalPins: number
    activePins: number
    orphanedPins: number
    error?: string
  }> = []

  for (const server of servers) {
    try {
      const kuboPins = await getKuboPins(server.apiUrl, server.authSecret)
      const orphaned = kuboPins.filter((cid) => !activeCids.has(cid))

      results.push({
        serverId: server.id,
        serverName: server.name,
        totalPins: kuboPins.length,
        activePins: kuboPins.length - orphaned.length,
        orphanedPins: orphaned.length,
      })
    } catch (err) {
      results.push({
        serverId: server.id,
        serverName: server.name,
        totalPins: 0,
        activePins: 0,
        orphanedPins: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    dryRun: true,
    activeCidsCount: activeCids.size,
    results,
  })
}
