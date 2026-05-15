/**
 * Получение ServerClient по ID сервера
 * Для использования в API роутах
 *
 * После миграции на agent-first архитектуру:
 * - Локальный сервер (null/'local') → RemoteServerClient к localhost:3100
 * - Удалённые серверы → RemoteServerClient к их хосту
 * - isLocal всегда false в возвращаемом объекте → routes всегда используют client
 */

import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getLocalClient, getServerClient } from './index'
import type { ServerClient, ServerInfo } from './types'

/**
 * Получить клиент для сервера по ID
 * Если serverId не указан или 'local', возвращает локальный агент (localhost:3100)
 * Всегда возвращает server.isLocal = false, чтобы routes использовали client-путь
 */
export async function getClientByServerId(serverId?: string | null): Promise<{
  client: ServerClient
  server: ServerInfo
}> {
  // Локальный сервер — dashboard-agent на localhost:3100
  if (!serverId || serverId === 'local') {
    return {
      client: getLocalClient(),
      server: {
        id: 'local',
        name: 'local',
        displayName: 'Local Server',
        host: 'localhost',
        port: 3100,
        isLocal: false, // false → routes используют client code path
        isActive: true,
        agentToken: null,
        lastSeen: null,
      },
    }
  }

  // Получаем сервер из БД
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  const server = await db.server.findUnique({
    where: { id: serverId },
    select: {
      id: true,
      name: true,
      displayName: true,
      host: true,
      port: true,
      isLocal: true,
      isActive: true,
      agentToken: true,
      lastSeen: true,
    },
  })

  if (!server) {
    throw new Error(`Server not found: ${serverId}`)
  }

  if (!server.isActive) {
    throw new Error(`Server is not active: ${server.name}`)
  }

  // Для локального сервера — используем getLocalClient() (правильный хост из env)
  if (server.isLocal) {
    return {
      client: getLocalClient(),
      server: { ...server, isLocal: false },
    }
  }

  return {
    client: getServerClient(server),
    // Перекрываем isLocal: false — routes всегда используют client code path
    server: { ...server, isLocal: false },
  }
}

/**
 * Обновить lastSeen для сервера после успешного запроса
 */
export async function updateServerLastSeen(serverId: string): Promise<void> {
  // Пропускаем для локального сервера
  if (serverId === 'local') {
    return
  }

  try {
    const session = await getServerSession()
    if (!session?.user) {
      return
    }

    const db = getEnhancedPrisma(session.user)
    await db.server.update({
      where: { id: serverId },
      data: { lastSeen: new Date() },
    })
  } catch (error) {
    console.error('[ServerClient] Failed to update lastSeen:', error)
  }
}
