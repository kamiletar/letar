/**
 * API функции для страницы серверов
 */

import type { ServerInfo } from '@/lib/server-client'
import type { DiscoveredApp, ServerWithApps } from '../_types'

/**
 * Получить список серверов с приложениями
 */
export async function fetchServers(): Promise<ServerWithApps[]> {
  const res = await fetch('/api/servers')
  if (!res.ok) {
    throw new Error('Failed to fetch servers')
  }
  return res.json()
}

/**
 * Проверить доступность сервера
 */
export async function checkServerHealth(server: ServerInfo): Promise<boolean> {
  if (server.isLocal) {
    return true
  }

  try {
    const res = await fetch(`/api/servers/${server.id}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) {
      return false
    }
    const data = await res.json()
    return data.online === true
  } catch {
    return false
  }
}

/**
 * Обнаружить приложения на сервере
 */
export async function discoverApps(serverId: string): Promise<DiscoveredApp[]> {
  const res = await fetch(`/api/servers/${serverId}/apps/discover`)
  if (!res.ok) {
    // Пробуем получить детали ошибки из ответа
    let errorMsg = `HTTP ${res.status}: ${res.statusText}`
    try {
      const error = await res.json()
      errorMsg = error.error || errorMsg
    } catch {
      // Ответ не JSON
    }
    throw new Error(errorMsg)
  }
  return res.json()
}
