/**
 * Глобальный throttle для ВСЕХ запросов к Shikimori CDN
 *
 * Единая точка координации — и downloadPoster(), и uploadImageToIpfs(),
 * и REST API клиенты используют acquireShikimoriSlot() вместо собственных throttle.
 * DDoS-Guard блокирует при частых запросах — 3с между запросами достаточно.
 */

import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('ShikimoriThrottle')

/** Минимальный интервал между ЛЮБЫМИ запросами к Shikimori (мс) */
const SHIKIMORI_MIN_INTERVAL = 3000

/** Время последнего запроса к Shikimori */
let lastShikimoriRequest = 0

/** Счётчик ожидающих запросов (для логирования) */
let pendingCount = 0

/**
 * Получить слот для запроса к Shikimori CDN
 *
 * Гарантирует минимум 3с между любыми запросами к shikimori.one.
 * Вызывается из downloadPoster(), uploadImageToIpfs(), anime-api, franchise-api.
 */
export async function acquireShikimoriSlot(): Promise<void> {
  pendingCount++

  const now = Date.now()
  const elapsed = now - lastShikimoriRequest

  if (elapsed < SHIKIMORI_MIN_INTERVAL) {
    const waitMs = SHIKIMORI_MIN_INTERVAL - elapsed
    if (pendingCount > 1) {
      log.debug('Ожидание слота Shikimori', { waitMs, pending: pendingCount })
    }
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }

  lastShikimoriRequest = Date.now()
  pendingCount--
}

/** Браузерные заголовки для обхода DDoS-Guard */
export const SHIKIMORI_BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  Referer: 'https://shikimori.one/',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'same-site',
}

/** Проверяет, является ли URL хостом Shikimori */
export function isShikimoriHost(url: string): boolean {
  try {
    const host = new URL(url).host
    return host.includes('shikimori')
  } catch {
    return false
  }
}
