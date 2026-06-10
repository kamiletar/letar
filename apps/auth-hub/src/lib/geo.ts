import geoip from 'geoip-lite'
import { headers } from 'next/headers'

/**
 * Возвращает двухбуквенный код страны по IP запроса.
 * IP читается из заголовка x-forwarded-for, который выставляет Nginx Proxy Manager.
 * В dev-окружении заголовок отсутствует → возвращает пустую строку.
 */
export async function getCountryCode(): Promise<string> {
  const hdrs = await headers()
  const forwarded = hdrs.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? ''
  return ip ? (geoip.lookup(ip)?.country ?? '') : ''
}

/**
 * Провайдеры, которые скрываются для российских IP (149-ФЗ / РКН).
 * VK и Yandex — российские, остаются доступными.
 */
export const BLOCKED_FOR_RU = new Set(['google', 'github', 'facebook'])
