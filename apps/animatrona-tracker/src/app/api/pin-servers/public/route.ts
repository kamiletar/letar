import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/pin-servers/public
 *
 * Публичный список IPFS серверов (pinner/relay/gateway) для конфигурации
 * Kubo в desktop приложении. БЕЗ авторизации, БЕЗ секретов.
 *
 * Используется desktop Animatrona app для автоматической синхронизации
 * Bootstrap / Peering.Peers через Kubo API при старте.
 *
 * Контракт согласован с задачей PurpleForge (desktop sync).
 */
export async function GET() {
  const servers = await prisma.pinServer.findMany({
    where: { status: 'ONLINE' },
    select: {
      id: true,
      name: true,
      role: true,
      peerId: true,
      swarmAddrs: true,
      updatedAt: true,
    },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  // Нормализация: выводим peeringRole по формуле из role
  // RELAY → peering (постоянное соединение для hole punching)
  // PINNER → bootstrap (для первоначального connect + peering)
  // GATEWAY → bootstrap
  const peeringRoleByRole: Record<string, 'bootstrap' | 'peering' | 'both'> = {
    RELAY: 'peering',
    PINNER: 'both',
    // both = Bootstrap (первый connect) + Peering (постоянное outbound-соединение)
    // Postоянное соединение критично: gateway должен всегда быть в Peering у десктопа,
    // иначе gateway не сможет инициировать bitswap для получения контента
    GATEWAY: 'both',
  }

  const payload = {
    version: 1,
    updatedAt:
      servers.length > 0
        ? servers.reduce((max, s) => (s.updatedAt > max ? s.updatedAt : max), servers[0].updatedAt).toISOString()
        : new Date().toISOString(),
    servers: servers
      .filter((s) => s.peerId && s.swarmAddrs.length > 0)
      .map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role.toLowerCase(), // "pinner" | "relay" | "gateway"
        peerId: s.peerId!,
        multiaddrs: s.swarmAddrs,
        peeringRole: peeringRoleByRole[s.role] ?? 'peering',
      })),
  }

  return NextResponse.json(payload, {
    headers: {
      // Кэш 5 минут — desktop может обращаться часто
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  })
}
