/**
 * Кешированный IPFS fetch с Redis-кешем.
 *
 * IPFS контент иммутабелен по CID — один и тот же CID всегда возвращает
 * один и тот же контент. Кеш хранится в Redis (TTL 24 часа),
 * при недоступности Redis — запрос идёт напрямую без кеширования.
 */

import { IPFS_GATEWAYS } from '@/lib/ipfs'
import { cached } from '@/lib/redis'

/** Таймаут для каждого IPFS fetch-запроса (мс) — 5 сек, чтобы не блокировать воркеры */
const FETCH_TIMEOUT = 5_000

/** TTL кеша в секундах (7 дней — IPFS контент иммутабелен по CID) */
const CACHE_TTL_SEC = 7 * 24 * 60 * 60

// ─── Публичный API ──────────────────────────────────────────────────

/**
 * Fetch JSON из IPFS с Redis-кешем и таймаутом. Бросает ошибку при неудаче.
 *
 * При таймауте основного gateway — автоматически пробует fallback gateways.
 * @param url — полный URL к IPFS ресурсу (содержит CID → уникален для контента)
 */
export async function fetchIpfsJson<T>(url: string): Promise<T> {
  return cached<T>(`ipfs:${url}`, CACHE_TTL_SEC, () => fetchWithGatewayFallback<T>(url))
}

/**
 * Fetch JSON из IPFS с Redis-кешем. Возвращает null при ошибке (не бросает).
 *
 * @param url — полный URL к IPFS ресурсу
 */
export async function fetchIpfsJsonSafe<T>(url: string): Promise<T | null> {
  try {
    return await cached<T>(`ipfs:${url}`, CACHE_TTL_SEC, () => fetchWithGatewayFallback<T>(url))
  } catch {
    return null
  }
}

// ─── Внутренние утилиты ─────────────────────────────────────────────

/**
 * Извлечь путь /ipfs/CID/... из полного URL для подстановки в другой gateway
 */
function extractIpfsPath(url: string): string | null {
  const match = url.match(/\/ipfs\/(.+)$/)
  return match ? `/ipfs/${match[1]}` : null
}

/**
 * Fetch JSON с fallback на другие gateways при таймауте основного.
 * Пробует основной URL, потом перебирает IPFS_GATEWAYS по порядку.
 */
async function fetchWithGatewayFallback<T>(url: string): Promise<T> {
  // Первая попытка — основной URL как есть
  try {
    return await fetchWithTimeout<T>(url)
  } catch (primaryError) {
    const ipfsPath = extractIpfsPath(url)
    if (!ipfsPath) {
      throw primaryError // Не IPFS URL — нечем фолбэчить
    }

    // Перебираем fallback gateways
    const errors: string[] = [(primaryError as Error).message]
    for (const gateway of IPFS_GATEWAYS.slice(1)) {
      const fallbackUrl = `${gateway}${ipfsPath}`
      try {
        return await fetchWithTimeout<T>(fallbackUrl)
      } catch (err) {
        errors.push(`${gateway}: ${(err as Error).message}`)
      }
    }

    throw new Error(`Не удалось загрузить данные из IPFS после ${errors.length} попыток:\n${errors.join('\n')}`, {
      cause: primaryError,
    })
  }
}

/**
 * Fetch JSON с AbortController таймаутом (5 секунд)
 */
async function fetchWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText}`)
    }

    return (await response.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}
