/**
 * Тонкий HTTP-клиент к Umami API (stats.letar.best). Логин по username/password (тот же
 * механизм, что apps/dashboard/src/app/api/analytics использует для проксирования), токен
 * кэшируется в памяти процесса до первого 401 — MCP-сервер живёт один stdio-сеанс, повторный
 * логин на каждый вызов инструмента не нужен.
 */

import { umamiPassword, umamiUrl, umamiUser } from './config.js'

export interface UmamiWebsite {
  id: string
  name: string
  domain: string
  createdAt?: string
}

export interface UmamiWebsiteStats {
  pageviews: { value: number; prev: number }
  visitors: { value: number; prev: number }
  visits: { value: number; prev: number }
  bounces: { value: number; prev: number }
  totaltime: { value: number; prev: number }
}

const PERIOD_MS: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

let cachedToken: string | null = null

async function login(): Promise<string> {
  const res = await fetch(`${umamiUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: umamiUser(), password: umamiPassword() }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    throw new Error(`Umami auth failed: HTTP ${res.status}`)
  }
  const data = (await res.json()) as { token?: string }
  if (!data.token) {
    throw new Error('Umami auth: ответ без token')
  }
  return data.token
}

async function getToken(forceRefresh = false): Promise<string> {
  if (!cachedToken || forceRefresh) {
    cachedToken = await login()
  }
  return cachedToken
}

/** Запрос к Umami API с Bearer-токеном. При 401 логинится заново и повторяет один раз. */
async function umamiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const doRequest = async (token: string) =>
    fetch(`${umamiUrl()}${path}`, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    })

  let res = await doRequest(await getToken())
  if (res.status === 401) {
    res = await doRequest(await getToken(true))
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Umami API error (${path}): HTTP ${res.status}${body ? ` — ${body.slice(0, 300)}` : ''}`)
  }
  return res.json() as Promise<T>
}

/** Все сайты, заведённые в Umami (постранично, pageSize=100 — их сейчас 24). */
export async function listWebsites(): Promise<UmamiWebsite[]> {
  const data = await umamiRequest<{ data?: UmamiWebsite[] } | UmamiWebsite[]>('/api/websites?pageSize=100')
  return Array.isArray(data) ? data : (data.data ?? [])
}

/** Найти сайт по домену (точное совпадение) среди всех заведённых. */
export async function findWebsiteByDomain(domain: string): Promise<UmamiWebsite | null> {
  const sites = await listWebsites()
  return sites.find((site) => site.domain === domain) ?? null
}

/** Статистика сайта за период. */
export async function getWebsiteStats(websiteId: string, period: keyof typeof PERIOD_MS): Promise<UmamiWebsiteStats> {
  const ms = PERIOD_MS[period]
  const now = Date.now()
  return umamiRequest<UmamiWebsiteStats>(`/api/websites/${websiteId}/stats?startAt=${now - ms}&endAt=${now}`)
}

/** Завести новый сайт в Umami. */
export async function createWebsite(name: string, domain: string): Promise<UmamiWebsite> {
  return umamiRequest<UmamiWebsite>('/api/websites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, domain }),
  })
}
