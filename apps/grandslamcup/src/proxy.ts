import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'

/**
 * Top-level сегменты приложения, не относящиеся к `[citySlug]` — siblings в `src/app/**`.
 * Первый сегмент пути, не входящий в этот список, трактуется роутером как `citySlug`
 * (см. `(public)/[citySlug]/layout.tsx`).
 */
const RESERVED_SEGMENTS = new Set([
  'admin',
  'api',
  'coach',
  'match',
  'my',
  'offline',
  'poet',
  'privacy',
  'profile',
  'sign-in',
  'bracket',
  'donate',
  'matches',
  'news',
  'players',
  'rules',
  'schedule',
  'standings',
  'teams',
  'venues',
  'system-404',
])

const CITY_SLUG_CACHE_TTL_MS = 5 * 60 * 1000

let cachedSlugs: Set<string> | null = null
let cachedAt = 0

async function isKnownCitySlug(slug: string): Promise<boolean> {
  const now = Date.now()
  if (!cachedSlugs || now - cachedAt >= CITY_SLUG_CACHE_TTL_MS) {
    const cities = await prisma.city.findMany({ select: { slug: true } })
    cachedSlugs = new Set(cities.map((city) => city.slug))
    cachedAt = now
  }
  return cachedSlugs.has(slug)
}

/**
 * `[citySlug]` — динамический сегмент верхнего уровня, ловит вообще любой опечатанный URL
 * сайта. `(public)/loading.tsx` (Suspense-граница) гасит HTTP-статус `notFound()` из
 * `layout.tsx` этого сегмента — заголовки ответа уходят до старта стрима, раньше catch-ветки
 * Next. Разбор — .claude/docs/nextjs-streaming-soft-404-loading-boundary.md
 *
 * Проверяем существование города здесь, до рендера, и при отсутствии делаем rewrite на
 * `/system-404` — реальный top-level роут без Suspense-границы над собой, там `notFound()`
 * отдаёт настоящий 404. Список слагов кэшируется в памяти процесса (TTL — не бить в БД на
 * каждый запрос), проверка выполняется только для сегментов вне `RESERVED_SEGMENTS`.
 */
export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname } = request.nextUrl
  const firstSegment = pathname.split('/')[1] ?? ''

  if (firstSegment === '' || RESERVED_SEGMENTS.has(firstSegment)) {
    return NextResponse.next()
  }

  if (await isKnownCitySlug(firstSegment)) {
    return NextResponse.next()
  }

  return NextResponse.rewrite(new URL('/system-404', request.url))
}

export default proxy

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
