import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { kuboHealthCheck, kuboRepoStat } from '@/lib/pinning'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/pin-servers/health-check
 * Проверить доступность всех пин-серверов, обновить статус и занятое место.
 * Серверы в статусе MAINTENANCE не затрагиваются (ручной статус).
 */
export async function POST() {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  // Берём только PINNER серверы кроме MAINTENANCE
  // RELAY и GATEWAY не имеют доступного Kubo API — их статус управляется вручную
  const servers = await prisma.pinServer.findMany({
    where: { status: { not: 'MAINTENANCE' }, role: 'PINNER' },
    select: { id: true, name: true, apiUrl: true, authSecret: true, status: true },
  })

  // Проверяем параллельно — health-check + repo/stat
  const [checks, stats] = await Promise.all([
    Promise.all(servers.map((server) => kuboHealthCheck(server.apiUrl, server.authSecret))),
    Promise.all(servers.map((server) => kuboRepoStat(server.apiUrl, server.authSecret))),
  ])

  const results = await Promise.all(
    servers.map(async (server, i) => {
      const check = checks[i]
      const stat = stats[i]
      const newStatus = check.online ? 'ONLINE' : 'OFFLINE'

      const updateData: Record<string, unknown> = {}

      if (server.status !== newStatus) {
        updateData.status = newStatus
      }
      if (check.peerId) {
        updateData.peerId = check.peerId
      }
      if (stat.repoSize !== undefined && stat.repoSize !== null) {
        updateData.usedBytes = BigInt(stat.repoSize)
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.pinServer.update({
          where: { id: server.id },
          data: updateData,
        })
      }

      return {
        id: server.id,
        name: server.name,
        wasStatus: server.status,
        nowStatus: newStatus,
        usedBytes: stat.repoSize ?? null,
      }
    }),
  )

  return NextResponse.json({ data: results })
}
