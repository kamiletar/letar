import { createRateLimiter } from '@letar/api-server'
import { NextResponse } from 'next/server'

/**
 * Rate limiter для дорогих/опасных операций dashboard: запуск деплоя, управление контейнерами,
 * git pull и правки nginx на хосте выполняются через nsenter/dashboard-agent от имени одной
 * авторизованной сессии. Дашборд доступен только за VPN (см. .claude/rules/dashboard.md), поэтому
 * это не защита от анонимного злоумышленника, а защита от одной скомпрометированной
 * сессии/CSRF-цепочки, которая иначе могла бы дёргать эти операции без ограничений.
 *
 * Ключ — id пользователя сессии, не IP: за VPN у разных сотрудников может быть общий выходной IP.
 */
const hostOpsLimiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 })

export function checkHostOpsRateLimit(key: string) {
  return hostOpsLimiter.checkRateLimit(key)
}

export function tooManyRequestsResponse(retryAfter?: number) {
  return NextResponse.json(
    { success: false, error: 'Слишком много запросов, попробуйте позже' },
    { status: 429, headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined },
  )
}
