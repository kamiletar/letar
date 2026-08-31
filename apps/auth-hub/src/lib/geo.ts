import { getClientIp } from '@letar/demo-protection'
import geoip from 'geoip-lite'

/**
 * Возвращает двухбуквенный код страны по IP запроса.
 * IP читается из x-forwarded-for/x-real-ip (последний хоп, дописанный Traefik — первый хоп
 * произвольно подделывается клиентом, см. .claude/docs/shared-get-client-ip-consolidation.md).
 * В dev-окружении заголовки отсутствуют → geoip.lookup('unknown') вернёт undefined.
 */
export async function getCountryCode(): Promise<string> {
  const ip = await getClientIp()
  return geoip.lookup(ip)?.country ?? ''
}

/**
 * Провайдеры, которые скрываются для российских IP (149-ФЗ / РКН).
 * VK и Yandex — российские, остаются доступными.
 */
export const BLOCKED_FOR_RU = new Set(['google', 'github', 'facebook'])
