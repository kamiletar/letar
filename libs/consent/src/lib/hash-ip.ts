import { createHash } from 'node:crypto'

/** Достаточно `.get(name)` — подходит и Web `Headers`, и Next.js `next/headers()`. */
export interface HeaderReader {
  get(name: string): string | null
}

/**
 * Хэширует IP из заголовков SHA-256 (152-ФЗ: сырой IP не хранится).
 *
 * Берёт ПОСЛЕДНИЙ адрес из `x-forwarded-for`, не первый. Traefik (единственный edge-прокси
 * перед всеми приложениями монорепо) не настроен на `forwardedHeaders.trustedIPs` и не вырезает
 * уже пришедший заголовок — он ДОПИСЫВАЕТ свой `RemoteAddr` последним элементом. Первый элемент —
 * произвольная строка, которую клиент указал сам в запросе (`X-Forwarded-For: <что угодно>`), и
 * хэш от неё юридически бесполезен как доказательство IP при проверке РКН. Та же логика — в
 * `@letar/demo-protection` `getClientIpFromHeaders`; не консолидировано в одну реализацию из-за
 * широкого radius потребителей `@letar/consent` (~13 приложений), см.
 * `.claude/docs/shared-get-client-ip-consolidation.md`.
 */
export function hashIpFromHeaders(headers: HeaderReader): string {
  const forwarded = headers.get('x-forwarded-for')
  const ips = forwarded?.split(',').map((ip) => ip.trim()).filter(Boolean) ?? []
  const ipRaw = ips.length > 0 ? ips[ips.length - 1] : (headers.get('x-real-ip') ?? 'unknown')
  return createHash('sha256').update(ipRaw).digest('hex')
}

/** Как `hashIpFromHeaders`, но принимает целиком `Request` (Route Handlers). */
export function hashIp(request: Request): string {
  return hashIpFromHeaders(request.headers)
}
