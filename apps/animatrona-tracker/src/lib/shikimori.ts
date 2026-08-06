/**
 * Shikimori API клиент
 *
 * API: https://shikimori.one/api/doc
 * Rate limits: 5 RPS, 90 RPM
 * ОБЯЗАТЕЛЬНО: User-Agent с именем приложения (иначе IP бан)
 */

import type { WatchStatus } from '@/generated/prisma'

const SHIKIMORI_BASE = 'https://shikimori.one'
const USER_AGENT = 'AnimatronaTracker'

/** Типы ответов Shikimori API */

export interface ShikimoriUserRate {
  id: number
  score: number
  status: ShikimoriStatus
  target_id: number
  target_type: 'Anime' | 'Manga'
  episodes: number
  rewatches: number
  updated_at: string
}

export interface ShikimoriUser {
  id: number
  nickname: string
  avatar: string
  image: {
    x160: string
    x148: string
    x80: string
    x64: string
    x48: string
    x32: string
    x16: string
  }
}

type ShikimoriStatus = 'planned' | 'watching' | 'rewatching' | 'completed' | 'on_hold' | 'dropped'

/** Маппинг статусов Shikimori → WatchStatus */
const STATUS_MAP: Record<ShikimoriStatus, WatchStatus> = {
  planned: 'PLANNED',
  watching: 'WATCHING',
  rewatching: 'WATCHING',
  completed: 'COMPLETED',
  on_hold: 'ON_HOLD',
  dropped: 'DROPPED',
}

/** Маппинг WatchStatus → Shikimori */
const REVERSE_STATUS_MAP: Record<string, ShikimoriStatus> = {
  PLANNED: 'planned',
  WATCHING: 'watching',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  DROPPED: 'dropped',
  NOT_STARTED: 'planned',
}

export function mapShikimoriStatus(status: string): WatchStatus {
  return STATUS_MAP[status as ShikimoriStatus] ?? 'NOT_STARTED'
}

export function mapToShikimoriStatus(status: string): ShikimoriStatus {
  return REVERSE_STATUS_MAP[status] ?? 'planned'
}

/**
 * Запрос к Shikimori API с User-Agent и Bearer токеном
 */
export async function fetchShikimoriApi<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${SHIKIMORI_BASE}${path}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Shikimori API ${response.status}: ${text}`)
  }

  return response.json() as Promise<T>
}

/**
 * Обновить access token через refresh token
 */
export async function refreshShikimoriToken(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const response = await fetch(`${SHIKIMORI_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: process.env.AUTH_SHIKIMORI_ID,
      client_secret: process.env.AUTH_SHIKIMORI_SECRET,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error(`Shikimori token refresh failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Получить информацию о текущем пользователе
 */
export async function getShikimoriUser(accessToken: string): Promise<ShikimoriUser> {
  return fetchShikimoriApi<ShikimoriUser>('/api/users/whoami', accessToken)
}

/**
 * Получить все anime user_rates пользователя
 * Shikimori пагинирует по 5000 — обычно достаточно одного запроса
 */
export async function getShikimoriUserRates(accessToken: string): Promise<ShikimoriUserRate[]> {
  const user = await getShikimoriUser(accessToken)
  const rates = await fetchShikimoriApi<ShikimoriUserRate[]>(
    `/api/v2/user_rates?user_id=${user.id}&target_type=Anime&limit=5000`,
    accessToken,
  )
  return rates
}
