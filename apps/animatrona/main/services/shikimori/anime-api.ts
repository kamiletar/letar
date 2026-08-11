/**
 * REST API клиент для получения дополнительных данных аниме из Shikimori
 * Используется для полей, недоступных через GraphQL API (например, source)
 *
 * API: GET https://shikimori.one/api/animes/{id}
 *
 * ⚠️ Используем глобальный `fetch` (Node.js/undici), НЕ `net.fetch` (Electron/Chromium) —
 * подробное объяснение см. в `client.ts` у `GRAPHQL_ENDPOINTS` (TUN-VPN режет Chromium-стек
 * по TLS-отпечатку, обычный Node-сокет проходит).
 */

import { createModuleLogger } from '../../utils/logger'
import { describeNetErrorWithDiagnostics } from '../../utils/net-error'
import { acquireShikimoriSlot } from './throttle'
import type {
  ShikimoriAnimeRestResponse,
  ShikimoriAnimeRolesResult,
  ShikimoriCharacterRole,
  ShikimoriPersonRole,
  ShikimoriRestRole,
} from './types'

const REST_API_BASE = 'https://shikimori.one/api'
const USER_AGENT = 'Animatrona/1.0 (Desktop App)'
const log = createModuleLogger('AnimeApi')

/** TTL кэша в миллисекундах (1 час — данные меняются редко) */
const CACHE_TTL_MS = 60 * 60 * 1000

/** In-memory кэш для ответов REST API */
const animeCache = new Map<number, { data: ShikimoriAnimeRestResponse; expiresAt: number }>()

/**
 * Ждёт необходимый интервал между запросами (делегирует глобальному throttle)
 */
async function throttle(): Promise<void> {
  await acquireShikimoriSlot()
}

/**
 * Получить данные аниме через REST API по ID
 *
 * Используется для получения полей, недоступных в GraphQL:
 * - source (manga, light_novel, original, etc.)
 *
 * @param shikimoriId ID аниме на Shikimori
 * @returns Ответ REST API или null если не найдено
 */
export async function getAnimeRestData(shikimoriId: number): Promise<ShikimoriAnimeRestResponse | null> {
  // Проверяем кэш
  const cached = animeCache.get(shikimoriId)
  if (cached && Date.now() < cached.expiresAt) {
    log.debug('Cache hit', { shikimoriId })
    return cached.data
  }

  // Throttle запросы
  await throttle()

  const url = `${REST_API_BASE}/animes/${shikimoriId}`
  log.info('Fetching anime REST data', { url })

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        await response.body?.cancel().catch(() => {
          /* игнорируем */
        })
        log.info('Anime not found', { shikimoriId })
        return null
      }
      await response.body?.cancel().catch(() => {
        /* игнорируем */
      })
      throw new Error(`Shikimori REST API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as ShikimoriAnimeRestResponse

    log.info('Got anime REST data', {
      shikimoriId,
      source: data.source ?? 'unknown',
      kind: data.kind ?? 'unknown',
    })

    // Кэшируем результат
    animeCache.set(shikimoriId, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })

    return data
  } catch (error) {
    log.error('Error fetching anime REST data', { shikimoriId, error })
    throw new Error(await describeNetErrorWithDiagnostics(error, url), { cause: error })
  }
}

/**
 * Очистить кэш REST данных аниме
 */
export function clearAnimeRestCache(): void {
  animeCache.clear()
  rolesCache.clear()
}

/** In-memory кэш для ролей аниме */
const rolesCache = new Map<number, { data: ShikimoriAnimeRolesResult; expiresAt: number }>()

const ROLES_CACHE_TTL_MS = 60 * 60 * 1000

/** Базовый URL для изображений Shikimori */
const SHIKIMORI_BASE = 'https://shikimori.one'

/**
 * Получить роли персонажей и персонала аниме через REST API
 *
 * Использует GET /api/animes/{id}/roles — альтернатива GraphQL personRoles/characterRoles,
 * которые приводят к 404 для аниме с большим количеством персонажей (Re:Zero и подобные).
 *
 * @param shikimoriId ID аниме на Shikimori
 * @returns Персонал и персонажи аниме
 */
export async function getAnimeRoles(shikimoriId: number): Promise<ShikimoriAnimeRolesResult> {
  const cached = rolesCache.get(shikimoriId)
  if (cached && Date.now() < cached.expiresAt) {
    log.debug('Roles cache hit', { shikimoriId })
    return cached.data
  }

  await throttle()

  const url = `${REST_API_BASE}/animes/${shikimoriId}/roles`
  log.info('Fetching anime roles via REST', { url })

  const TIMEOUT_MS = 20_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let rawRoles: ShikimoriRestRole[]
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!response.ok) {
      await response.body?.cancel().catch(() => {})
      throw new Error(`Shikimori REST roles error: ${response.status} ${response.statusText}`)
    }
    rawRoles = (await response.json()) as ShikimoriRestRole[]
  } catch (error) {
    clearTimeout(timer)
    throw error
  }

  const personRoles: ShikimoriPersonRole[] = []
  const characterRoles: ShikimoriCharacterRole[] = []

  for (const entry of rawRoles) {
    if (entry.character && entry.person) {
      // Запись о голосовом актёре — персонаж + сейю
      characterRoles.push({
        id: String(entry.character.id),
        rolesRu: entry.roles_ru,
        rolesEn: entry.roles,
        character: {
          id: String(entry.character.id),
          name: entry.character.name,
          russian: entry.character.russian,
          poster: {
            mainUrl: SHIKIMORI_BASE + entry.character.image.preview,
            originalUrl: SHIKIMORI_BASE + entry.character.image.original,
          },
        },
      })
      // Сейю тоже добавляем в personRoles
      const existingPerson = personRoles.find((p) => p.person.id === String(entry.person!.id))
      if (!existingPerson) {
        personRoles.push({
          id: String(entry.person.id),
          rolesRu: ['Актёры озвучивания'],
          rolesEn: ['Voice Actors'],
          person: {
            id: String(entry.person.id),
            name: entry.person.name,
            russian: entry.person.russian,
            poster: {
              mainUrl: SHIKIMORI_BASE + entry.person.image.preview,
              originalUrl: SHIKIMORI_BASE + entry.person.image.original,
            },
          },
        })
      }
    } else if (entry.person && !entry.character) {
      // Запись о стаффе (режиссёр, сценарист и т.д.)
      personRoles.push({
        id: String(entry.person.id),
        rolesRu: entry.roles_ru,
        rolesEn: entry.roles,
        person: {
          id: String(entry.person.id),
          name: entry.person.name,
          russian: entry.person.russian,
          poster: {
            mainUrl: SHIKIMORI_BASE + entry.person.image.preview,
            originalUrl: SHIKIMORI_BASE + entry.person.image.original,
          },
        },
      })
    }
  }

  log.info('Got anime roles via REST', {
    shikimoriId,
    personRoles: personRoles.length,
    characterRoles: characterRoles.length,
  })

  const result: ShikimoriAnimeRolesResult = { personRoles, characterRoles }
  rolesCache.set(shikimoriId, { data: result, expiresAt: Date.now() + ROLES_CACHE_TTL_MS })
  return result
}
