import { createHmac, timingSafeEqual } from 'node:crypto'

/** Подписанные значения для cookie: `base64url(json).подпись`. Без состояния на сервере. */

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

export function createSigned(
  data: Record<string, unknown>,
  secret: string,
  ttlSeconds: number,
  now = Date.now(),
): string {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(now / 1000) + ttlSeconds })).toString(
    'base64url',
  )
  return `${payload}.${sign(payload, secret)}`
}

/** Возвращает данные, если подпись верна и срок не вышел; иначе null. */
export function verifySigned<T extends Record<string, unknown>>(
  value: string | undefined,
  secret: string,
  now = Date.now(),
): (T & { exp: number }) | null {
  if (!value) { return null }
  const [payload, mac] = value.split('.')
  if (!payload || !mac) { return null }
  const expected = Buffer.from(sign(payload, secret))
  const actual = Buffer.from(mac)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) { return null }
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T & { exp: number }
    return typeof data.exp === 'number' && data.exp * 1000 > now ? data : null
  } catch {
    return null
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()) }
  }
  return out
}

export function cookieHeader(name: string, value: string, maxAgeSeconds: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`
}

export function clearCookieHeader(name: string): string {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
}
