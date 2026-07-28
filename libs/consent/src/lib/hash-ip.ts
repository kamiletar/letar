import { createHash } from 'node:crypto'

/**
 * Хэширует IP запроса SHA-256 (152-ФЗ: сырой IP не хранится).
 * Берёт первый адрес из `x-forwarded-for` (прокси/CDN), иначе `x-real-ip`.
 */
export function hashIp(request: Request): string {
  const ipRaw = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  return createHash('sha256').update(ipRaw).digest('hex')
}
