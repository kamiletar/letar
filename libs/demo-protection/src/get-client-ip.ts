import { headers } from 'next/headers'

/**
 * Извлекает IP клиента из заголовков запроса.
 * Поддерживает x-forwarded-for (Traefik) и x-real-ip.
 *
 * Берём ПОСЛЕДНИЙ IP в цепочке x-forwarded-for, не первый. Traefik (единственный edge-прокси
 * перед всеми приложениями монорепо, infra/traefik/) не настроен на `forwardedHeaders.trustedIPs`
 * и по умолчанию не вырезает уже пришедший заголовок — он ДОПИСЫВАЕТ свой `RemoteAddr` последним
 * элементом, оставляя всё, что прислал клиент, слева нетронутым. Первый элемент — это
 * произвольная строка, которую клиент указал сам в запросе (`X-Forwarded-For: <что угодно>`), а
 * не его реальный адрес — брать его для rate-limiting давало клиенту новый бакет на каждый
 * запрос простой сменой заголовка (security-auditor, 2026-09-01). Последний элемент — то, что
 * дописал сам Traefik, единственный хоп, которому можно верить.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded.split(',').map((ip) => ip.trim()).filter(Boolean)
    if (ips.length > 0) {
      return ips[ips.length - 1]
    }
  }
  return h.get('x-real-ip') ?? 'unknown'
}
