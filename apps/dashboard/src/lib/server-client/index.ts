/**
 * ServerClient Factory
 * Dashboard всегда обращается к серверам через dashboard-agent (RemoteServerClient)
 * LocalServerClient удалён — прямого доступа к системе нет
 */

import { RemoteServerClient } from './remote'
import type { ServerClient, ServerInfo } from './types'

export type {
  Container,
  ContainerPort,
  ContainerStats,
  CPUInfo,
  DatabaseStatsResult,
  DatabaseStatus,
  DiskInfo,
  MemoryInfo,
  NetworkInfo,
  NetworkInterface,
  NetworkStats,
  ServerClient,
  ServerInfo,
  SystemUptime,
} from './types'

// Кэш клиентов (ключ — ID сервера)
const clientCache = new Map<string, RemoteServerClient>()

/**
 * Получить клиент для сервера
 * Всегда возвращает RemoteServerClient — dashboard обращается только через агента
 */
export function getServerClient(server: ServerInfo): ServerClient {
  let client = clientCache.get(server.id)
  if (!client) {
    client = new RemoteServerClient(server)
    clientCache.set(server.id, client)
  }
  return client
}

/**
 * Сбросить кэш клиента (при изменении настроек сервера)
 */
export function resetServerClient(serverId: string): void {
  clientCache.delete(serverId)
}

/**
 * Сбросить все кэшированные клиенты
 */
export function resetAllClients(): void {
  clientCache.clear()
}

/**
 * Получить клиент для локального сервера (dashboard-agent на localhost:3100)
 * "Локальный" сервер — это dashboard-agent, запущенный рядом с dashboard на s2
 */
export function getLocalClient(): ServerClient {
  return getServerClient({
    id: 'local',
    name: 'local',
    displayName: 'Local Server',
    host: process.env.LOCAL_AGENT_HOST ?? 'localhost',
    port: Number(process.env.LOCAL_AGENT_PORT ?? 3100),
    isLocal: true,
    isActive: true,
    agentToken: process.env.LOCAL_AGENT_TOKEN ?? process.env.AGENT_TOKEN ?? '',
    lastSeen: null,
  })
}
