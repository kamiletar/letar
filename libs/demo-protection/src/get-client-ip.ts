import { headers } from 'next/headers'

/**
 * Извлекает IP клиента из заголовков запроса.
 * Поддерживает x-forwarded-for (nginx/proxy) и x-real-ip.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const forwarded = h.get('x-forwarded-for')
  if (forwarded) {
    // Берём первый IP (реальный клиент)
    return forwarded.split(',')[0].trim()
  }
  return h.get('x-real-ip') ?? 'unknown'
}
