/**
 * Клиент AniList GraphQL API — только для англоязычного synopsis (`descriptionEn`).
 *
 * Сильно проще Shikimori-клиента: один эндпоинт, один запрос, единственный потребитель
 * (`buildAnimeInfo`) — поэтому inline-throttle прямо здесь, без отдельного `throttle.ts`.
 */

import { createModuleLogger } from '../../utils/logger'
import type { AniListMedia, AniListMediaResponse, GetAniListDescriptionParams } from './types'

const log = createModuleLogger('AniListClient')

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'

const QUERY = `
  query GetAnimeDescription($id: Int, $idMal: Int) {
    Media(id: $id, idMal: $idMal, type: ANIME) {
      id
      idMal
      description(asHtml: false)
    }
  }
`

/**
 * Degraded rate limit AniList — около 30 запросов/мин при исчерпанном обычном лимите.
 * Минимальный интервал между запросами с запасом: 60_000 / 30 = 2000мс → 2.1с.
 */
const MIN_REQUEST_INTERVAL_MS = 2100

let lastRequestAt = 0

/** Ждёт минимальный интервал между запросами к AniList */
async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastRequestAt
  const waitMs = MIN_REQUEST_INTERVAL_MS - elapsed
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs))
  }
  lastRequestAt = Date.now()
}

/** TTL in-memory кэша (не персистентный — как у `getAnimeExtended` в Shikimori-клиенте) */
const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  data: AniListMedia | null
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()

function cacheKey(params: GetAniListDescriptionParams): string {
  return `${params.anilistId ?? ''}:${params.malId ?? ''}`
}

/**
 * Получить англоязычное описание аниме с AniList.
 *
 * ⚠️ Используем глобальный `fetch` (Node.js/undici), не `net.fetch` — та же причина
 * TUN-VPN/TLS-отпечатка, что и у Shikimori (см. комментарий у `GRAPHQL_ENDPOINTS` в
 * `shikimori/client.ts`).
 *
 * Non-fatal по конструкции — вызывающий код (`buildAnimeInfo`) ловит исключение сам и
 * продолжает без `descriptionEn`, а не роняет генерацию AnimeInfo целиком.
 *
 * @returns `null`, если ни один идентификатор не передан, аниме не найдено на AniList,
 *   или у него нет описания
 */
export async function getAniListDescription(params: GetAniListDescriptionParams): Promise<AniListMedia | null> {
  const { anilistId, malId } = params
  if (!anilistId && !malId) {
    return null
  }

  const key = cacheKey(params)
  const cached = cache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }

  await throttle()

  const variables = anilistId ? { id: anilistId } : { idMal: malId }

  log.info('GraphQL → Media (AniList)', { variables })

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: QUERY, variables }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const bodySnippet = (await response.text().catch(() => '')).slice(0, 300)
      throw new Error(`AniList API error: ${response.status} ${response.statusText} — ${bodySnippet || '(пусто)'}`)
    }

    const json = (await response.json()) as { data?: AniListMediaResponse; errors?: { message: string }[] }

    if (json.errors && json.errors.length > 0) {
      throw new Error(`AniList GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`)
    }

    const media = json.data?.Media ?? null
    cache.set(key, { data: media, expiresAt: Date.now() + CACHE_TTL_MS })

    log.info('GraphQL ← Media (AniList) OK', { found: !!media })
    return media
  } finally {
    clearTimeout(timer)
  }
}

/** Очистить кэш (для тестов) */
export function clearAniListCache(): void {
  cache.clear()
}
