import { createHash } from 'node:crypto'

/** Достаточно `.get(name)` — подходит и Web `Headers`, и Next.js `next/headers()`. */
export interface HeaderReader {
  get(name: string): string | null
}

/**
 * Хэширует IP из заголовков SHA-256 (152-ФЗ: сырой IP не хранится).
 * Берёт первый адрес из `x-forwarded-for` (прокси/CDN), иначе `x-real-ip`.
 */
export function hashIpFromHeaders(headers: HeaderReader): string {
  const ipRaw = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headers.get('x-real-ip') ?? 'unknown'
  return createHash('sha256').update(ipRaw).digest('hex')
}

/** Как `hashIpFromHeaders`, но принимает целиком `Request` (Route Handlers). */
export function hashIp(request: Request): string {
  return hashIpFromHeaders(request.headers)
}
