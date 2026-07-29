/** Общие типы и функции для аналитики Umami */

export interface DomainPageViews {
  domain: string
  today: number
  last7Days: number
}

/** Загрузить грубый счётчик посещений (без ПДн) — дополнение к Umami, см. lib/pageview-counter.ts */
export async function fetchPageViews(): Promise<DomainPageViews[]> {
  const res = await fetch('/api/analytics/pageviews')
  if (!res.ok) {
    return []
  }
  const json = await res.json()
  return json.data ?? []
}

export interface UmamiWebsite {
  id: string
  name: string
  domain: string
  createdAt?: string
}

export interface SiteStats {
  pageviews: number
  visitors: number
  visits: number
  bounces: number
  totaltime: number
}

/** Загрузить список сайтов из Umami */
export async function fetchSites(): Promise<UmamiWebsite[]> {
  const res = await fetch('/api/analytics/sites')
  if (!res.ok) {
    throw new Error('Failed to fetch sites')
  }
  const json = await res.json()
  return json.data ?? []
}

/** Загрузить статистику сайта за период */
export async function fetchSiteStats(websiteId: string): Promise<SiteStats> {
  const res = await fetch(`/api/analytics/stats?websiteId=${websiteId}&period=24h`)
  if (!res.ok) {
    throw new Error('Failed to fetch stats')
  }
  const json = await res.json()
  return json.data
}

/** Проверить наличие UMAMI_WEBSITE_ID в .env.docker по доменам */
export async function fetchEnvStatus(domains: string[]): Promise<Record<string, boolean>> {
  if (domains.length === 0) {
    return {}
  }
  try {
    const res = await fetch(`/api/analytics/env-status?domains=${domains.join(',')}`)
    if (!res.ok) {
      return {}
    }
    const json = await res.json()
    return json.data ?? {}
  } catch {
    return {}
  }
}

/** Записать Website ID в .env.docker приложения на сервере (по домену) */
export async function writeEnvToServer(domain: string, websiteId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/analytics/env`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain, websiteId }),
    })
    if (res.ok) {
      return { ok: true }
    }
    const text = await res.text().catch(() => '')
    let errorMessage = 'Неизвестная ошибка'
    try {
      const err = JSON.parse(text)
      if (err.error) {
        errorMessage = err.error
      }
    } catch {
      if (text) {
        errorMessage = text
      }
    }
    return { ok: false, error: errorMessage }
  } catch {
    return { ok: false, error: 'Сервер недоступен' }
  }
}
