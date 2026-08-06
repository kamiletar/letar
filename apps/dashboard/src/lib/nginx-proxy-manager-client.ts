/**
 * Получение NPM клиента по ID сервера
 * Для использования в API роутах
 */

import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { NpmConfig } from '@/lib/nginx-proxy-manager'
import { getNpmClientForServer, npmApi } from '@/lib/nginx-proxy-manager'

/** Информация о NPM сервера */
export interface NpmServerInfo {
  id: string
  name: string
  displayName: string
  npmUrl: string
  npmEmail: string
}

/**
 * Получить NPM клиент для сервера по ID
 * Для локального сервера: сначала БД, потом .env
 */
export async function getNpmClientByServerId(serverId?: string | null): Promise<{
  client: ReturnType<typeof getNpmClientForServer>
  server: NpmServerInfo | null
  hasNpm: boolean
}> {
  // Получаем сервер из БД
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  // Для локального сервера или без serverId — ищем isLocal: true
  const server = await db.server.findFirst({
    where: !serverId || serverId === 'local' ? { isLocal: true } : { id: serverId },
    select: {
      id: true,
      name: true,
      displayName: true,
      isLocal: true,
      isActive: true,
      npmUrl: true,
      npmEmail: true,
      npmPassword: true,
    },
  })

  if (!server) {
    throw new Error(serverId ? `Server not found: ${serverId}` : 'Local server not found')
  }

  if (!server.isActive) {
    throw new Error(`Server is not active: ${server.name}`)
  }

  // Проверяем есть ли NPM конфигурация в БД
  const hasNpm = !!(server.npmUrl && server.npmEmail && server.npmPassword)

  // Для локального сервера: если в БД нет, используем .env
  if (server.isLocal && !hasNpm) {
    const envUrl = process.env.NPM_API_URL
    const envEmail = process.env.NPM_API_EMAIL
    const envPassword = process.env.NPM_API_PASSWORD
    if (envUrl && envEmail && envPassword) {
      return {
        client: npmApi, // Использует .env
        server: {
          id: server.id,
          name: server.name,
          displayName: server.displayName,
          npmUrl: envUrl,
          npmEmail: envEmail,
        },
        hasNpm: true,
      }
    }
  }

  return {
    client: getNpmClientForServer(server),
    server: hasNpm
      ? {
        id: server.id,
        name: server.name,
        displayName: server.displayName,
        npmUrl: server.npmUrl!,
        npmEmail: server.npmEmail!,
      }
      : null,
    hasNpm,
  }
}

/**
 * Получить NPM конфигурацию сервера (без пароля)
 * Для локального сервера: сначала БД, потом .env
 */
export async function getNpmConfigByServerId(serverId?: string | null): Promise<{
  hasNpm: boolean
  config: Omit<NpmConfig, 'password'> | null
}> {
  const session = await getServerSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  // Для локального сервера или без serverId — ищем isLocal: true
  const server = await db.server.findFirst({
    where: !serverId || serverId === 'local' ? { isLocal: true } : { id: serverId },
    select: {
      isLocal: true,
      npmUrl: true,
      npmEmail: true,
      npmPassword: true,
    },
  })

  if (!server) {
    return { hasNpm: false, config: null }
  }

  // Проверяем есть ли NPM конфигурация в БД
  const hasNpm = !!(server.npmUrl && server.npmEmail && server.npmPassword)

  // Для локального сервера: если в БД нет, используем .env
  if (server.isLocal && !hasNpm) {
    const envUrl = process.env.NPM_API_URL
    const envEmail = process.env.NPM_API_EMAIL
    const envPassword = process.env.NPM_API_PASSWORD
    if (envUrl && envEmail && envPassword) {
      return {
        hasNpm: true,
        config: { url: envUrl, email: envEmail },
      }
    }
  }

  return {
    hasNpm,
    config: hasNpm ? { url: server.npmUrl!, email: server.npmEmail! } : null,
  }
}
