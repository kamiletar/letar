/**
 * GraphQL клиент для Shikimori API
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { app, nativeImage } from 'electron'
import { createModuleLogger } from '../../utils/logger'
import { describeNetErrorWithDiagnostics } from '../../utils/net-error'

import {
  GET_ANIME_DETAILS_QUERY,
  GET_ANIME_EXTENDED_NO_ROLES_QUERY,
  GET_ANIME_WITH_RELATED_QUERY,
  SEARCH_ANIME_QUERY,
} from './queries'
import { acquireShikimoriSlot, SHIKIMORI_BROWSER_HEADERS } from './throttle'
import type {
  PosterDownloadResult,
  ShikimoriAnimeDetails,
  ShikimoriAnimeExtended,
  ShikimoriAnimePreview,
  ShikimoriAnimeWithRelated,
  ShikimoriDetailsResponse,
  ShikimoriExtendedNoRolesResponse,
  ShikimoriSearchOptions,
  ShikimoriSearchResponse,
  ShikimoriWithRelatedResponse,
} from './types'

const log = createModuleLogger('ShikimoriClient')

/**
 * Список эндпоинтов GraphQL. Только .io — .one теперь всегда 301-редиректит POST /api/graphql
 * на .io (домен мигрировал), а фолбэк на .one бесполезен: fetch() при 301 на POST молча
 * превращает его в GET без тела (спецификация), Shikimori отвечает 404 (роут только под POST).
 * redirect: 'manual' для ручной обработки в Electron net.fetch не работает (бросает
 * "Redirect was cancelled" вместо ответа) — поэтому редирект не обрабатываем, а просто не
 * ходим туда, откуда он неизбежен.
 */
const GRAPHQL_ENDPOINTS = ['https://shikimori.io/api/graphql']
let activeEndpointIdx = 0
const USER_AGENT = 'Animatrona/1.0 (Desktop App)'

/**
 * ⚠️ Используем глобальный `fetch` (Node.js/undici), НЕ `net.fetch` (Electron/Chromium).
 *
 * TUN-режим VPN/прокси (Clash, FlClash и т.п.) перехватывает пакеты на уровне сетевого
 * адаптера ОС — `session.resolveProxy()` в таком случае честно возвращает `DIRECT` (с точки
 * зрения Chromium прокси вообще нет), поэтому `session.setProxy()`/`proxyBypassRules` здесь
 * бессильны в принципе — блокировка происходит НИЖЕ уровня прокси-настроек Chromium.
 * Отличие оказалось в TLS-отпечатке: TUN-клиент различает Chromium-стек (`net.fetch`) и
 * Node-стек (`fetch`/undici) по ClientHello и режет только первый — тот же самый запрос
 * (метод/путь/заголовки/тело) через обычный Node-сокет проходит с 200 OK, через net.fetch
 * падает net::ERR_FAILED. Диагностика — `describeNetErrorWithDiagnostics()` (`net-error.ts`),
 * которая как раз повторяет упавший запрос через `node:https` для сравнения.
 *
 * Браузерные заголовки ниже (`DEFAULT_HEADERS`) изначально добавлялись «для обхода DPI», но
 * при таком диагнозе они как раз ухудшают ситуацию с TUN-VPN (антибот-защита сайта тут ни при
 * чём) — оставлены, т.к. не мешают обычным сетям без DPI/TUN-перехвата.
 */
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
  Referer: 'https://shikimori.one/',
  Origin: 'https://shikimori.one',
}

// Throttle перенесён в shikimori/throttle.ts (глобальный для всех Shikimori-запросов)

// === IN-MEMORY CACHE ===

/** TTL кэша в миллисекундах (5 минут) */
const CACHE_TTL_MS = 5 * 60 * 1000

/** Максимальное количество записей в кэше */
const CACHE_MAX_ENTRIES = 100

/** Структура записи кэша */
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

/** In-memory кэш для API ответов */
const apiCache = new Map<string, CacheEntry<unknown>>()

/** Символ для обозначения "не найдено в кэше" */
const CACHE_MISS = Symbol('CACHE_MISS')

/**
 * Получить значение из кэша
 * Возвращает CACHE_MISS если не найдено или истёк TTL
 */
function getCached<T>(key: string): T | typeof CACHE_MISS {
  const entry = apiCache.get(key)
  if (!entry) {
    return CACHE_MISS
  }

  // Проверяем TTL
  if (Date.now() > entry.expiresAt) {
    apiCache.delete(key)
    return CACHE_MISS
  }

  return entry.data as T
}

/**
 * Сохранить значение в кэш
 */
function setCache<T>(key: string, data: T): void {
  // Очищаем старые записи если превышен лимит
  if (apiCache.size >= CACHE_MAX_ENTRIES) {
    const now = Date.now()
    // Удаляем просроченные
    for (const [k, v] of apiCache) {
      if (now > v.expiresAt) {
        apiCache.delete(k)
      }
    }
    // Если всё ещё много — удаляем первую половину (LRU-подобное)
    if (apiCache.size >= CACHE_MAX_ENTRIES) {
      const keysToDelete = Array.from(apiCache.keys()).slice(0, CACHE_MAX_ENTRIES / 2)
      for (const k of keysToDelete) {
        apiCache.delete(k)
      }
    }
  }

  apiCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })
}

/**
 * Очистить весь кэш (для тестов или принудительного обновления)
 */
export function clearApiCache(): void {
  apiCache.clear()
}

/**
 * Ждёт необходимый интервал между запросами (делегирует глобальному throttle)
 */
async function throttle(): Promise<void> {
  await acquireShikimoriSlot()
}

/**
 * Выполняет GraphQL запрос к Shikimori API
 */
async function executeQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  // Throttle запросы для избежания 429
  await throttle()

  // Извлекаем название операции из query для логирования
  const opMatch = query.match(/(?:query|mutation)\s+(\w+)/)
  const opName = opMatch?.[1] ?? 'unknown'
  const varsStr = Object.entries(variables)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(', ')

  // Пробуем все endpoint'ы начиная с последнего рабочего
  const endpointsToTry = [
    GRAPHQL_ENDPOINTS[activeEndpointIdx],
    ...GRAPHQL_ENDPOINTS.filter((_, i) => i !== activeEndpointIdx),
  ]

  const MAX_ATTEMPTS = 2
  /** Ошибки по каждому эндпоинту за все попытки — чтобы не терять первую при фоллбэке на следующий */
  const endpointErrors: { endpoint: string; message: string }[] = []

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let lastError: Error | null = null

    for (const endpoint of endpointsToTry) {
      const startMs = Date.now()
      log.info(`GraphQL → ${opName} [${new URL(endpoint).hostname}] (попытка ${attempt}/${MAX_ATTEMPTS})`, {
        variables: varsStr,
      })

      try {
        // AbortSignal.timeout не работает надёжно в Electron — используем явный AbortController
        // 30с (не 15с): за прокси/DPI-обходом (например Clash в TUN-режиме) антибот-защита
        // сайта (DDoS-Guard) может держать соединение по 15-20+ секунд перед тем как пропустить —
        // в браузере это выглядит как "долгая загрузка", а не блокировка
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 30_000)
        let response: Response
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({ query, variables }),
            signal: controller.signal,
          })
        } finally {
          clearTimeout(timer)
        }

        const elapsed = Date.now() - startMs

        if (!response.ok) {
          // Читаем тело ответа (не отбрасываем) — на 404/403 от прокси или DDoS-Guard
          // там обычно осмысленная HTML/JSON страница с причиной, а не пустой ответ
          const bodyText = await response.text().catch(() => '')
          const bodySnippet = bodyText.slice(0, 300)
          log.warn(`GraphQL ← ${opName} FAILED`, { endpoint, status: response.status, elapsed, bodySnippet })
          const message = `${response.status} ${response.statusText} — ${bodySnippet || '(пусто)'}`
          endpointErrors.push({ endpoint, message })
          // 404/502/503 от GraphQL — скорее всего DPI или временный сбой, пробуем следующий endpoint
          lastError = new Error(`Shikimori API error: ${response.status} ${response.statusText}`)
          continue
        }

        const json = (await response.json()) as { data?: T; errors?: { message: string }[] }

        if (json.errors && json.errors.length > 0) {
          log.error(`GraphQL ← ${opName} ERRORS`, { errors: json.errors.map((e) => e.message), elapsed })
          throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`)
        }

        if (!json.data) {
          log.error(`GraphQL ← ${opName} NO DATA`, { elapsed })
          throw new Error('No data in response')
        }

        // Запоминаем рабочий endpoint
        const idx = GRAPHQL_ENDPOINTS.indexOf(endpoint)
        if (idx !== -1 && idx !== activeEndpointIdx) {
          log.info(`Переключились на ${new URL(endpoint).hostname} (предыдущий недоступен)`)
          activeEndpointIdx = idx
        }

        log.info(`GraphQL ← ${opName} OK`, { elapsed })
        return json.data
      } catch (error) {
        const elapsed = Date.now() - startMs
        const errMsg = error instanceof Error ? error.message : String(error)

        // TypeError: terminated — приложение закрывается, не фоллбэчить
        if (error instanceof TypeError && error.message === 'terminated') {
          throw new Error('Соединение прервано', { cause: error })
        }

        // Сетевая ошибка или таймаут — пробуем следующий endpoint
        // net.fetch (Electron/Chromium) кидает ошибки вида "net::ERR_FAILED",
        // "net::ERR_NAME_NOT_RESOLVED", "net::ERR_CONNECTION_RESET" и т.д. —
        // отличается от Node fetch ("fetch failed", "ECONNRESET")
        const isNetworkError = errMsg.includes('fetch failed')
          || errMsg.includes('ECONNRESET')
          || errMsg.includes('ETIMEDOUT')
          || errMsg.includes('ERR_NAME_NOT_RESOLVED')
          || errMsg.includes('net::')
          || errMsg.includes('abort')
          || errMsg.includes('TimeoutError')
          || error instanceof DOMException
        if (isNetworkError) {
          log.warn(`GraphQL ← ${opName} NETWORK ERROR на ${new URL(endpoint).hostname}, пробуем следующий`, {
            error: errMsg,
            elapsed,
          })
          endpointErrors.push({ endpoint, message: errMsg })
          lastError = error instanceof Error ? error : new Error(errMsg)
          continue
        }

        // API ошибка — не фоллбэчить
        log.error(`GraphQL ← ${opName} ERROR`, { error: errMsg, elapsed })
        throw error
      }
    }

    // Все endpoint'ы упали по сети — повтор через паузу
    if (lastError && attempt < MAX_ATTEMPTS) {
      log.warn(`GraphQL ${opName}: все endpoint'ы недоступны, повтор через 3с (попытка ${attempt}/${MAX_ATTEMPTS})`)
      await new Promise((resolve) => setTimeout(resolve, 3_000))
      continue
    }

    // Исчерпали все попытки — показываем историю по каждому эндпоинту, а не только последнюю ошибку
    if (lastError) {
      const history = endpointErrors.map((e) => `— ${e.endpoint}: ${e.message}`).join('\n')
      const lastEndpoint = endpointErrors[endpointErrors.length - 1]?.endpoint ?? endpointsToTry[0]
      const diagnostics = await describeNetErrorWithDiagnostics(lastError, lastEndpoint, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: JSON.stringify({ query, variables }),
      })
      throw new Error(`${diagnostics}\n\nПопытки по эндпоинтам:\n${history}`)
    }
    throw new Error("Все Shikimori API endpoint'ы недоступны")
  }

  throw new Error("Все Shikimori API endpoint'ы недоступны")
}

/**
 * Поиск аниме по названию
 */
export async function searchAnime(options: ShikimoriSearchOptions): Promise<ShikimoriAnimePreview[]> {
  const { search, limit = 10 } = options

  const data = await executeQuery<ShikimoriSearchResponse>(SEARCH_ANIME_QUERY, {
    search,
    limit,
  })

  return data?.animes ?? []
}

/**
 * Получить детали аниме по Shikimori ID
 * Использует in-memory кэш для уменьшения запросов к API
 */
export async function getAnimeDetails(shikimoriId: number): Promise<ShikimoriAnimeDetails | null> {
  const cacheKey = `details:${shikimoriId}`

  // Проверяем кэш
  const cached = getCached<ShikimoriAnimeDetails | null>(cacheKey)
  if (cached !== CACHE_MISS) {
    return cached
  }

  const data = await executeQuery<ShikimoriDetailsResponse>(GET_ANIME_DETAILS_QUERY, {
    ids: String(shikimoriId),
  })

  const result = data?.animes?.[0] ?? null

  // Сохраняем в кэш
  setCache(cacheKey, result)

  return result
}

/**
 * Получить аниме со связанными (related) по Shikimori ID
 * Использует in-memory кэш для уменьшения запросов к API
 */
export async function getAnimeWithRelated(shikimoriId: number): Promise<ShikimoriAnimeWithRelated | null> {
  const cacheKey = `related:${shikimoriId}`

  // Проверяем кэш
  const cached = getCached<ShikimoriAnimeWithRelated | null>(cacheKey)
  if (cached !== CACHE_MISS) {
    return cached
  }

  const data = await executeQuery<ShikimoriWithRelatedResponse>(GET_ANIME_WITH_RELATED_QUERY, {
    ids: String(shikimoriId),
  })

  const result = data?.animes?.[0] ?? null

  // Сохраняем в кэш
  setCache(cacheKey, result)

  return result
}

/**
 * Получить расширенные метаданные аниме по Shikimori ID (v0.5.1)
 * Включает студии, стафф, персонажей, фандабберов, внешние ссылки
 * Использует in-memory кэш для уменьшения запросов к API
 *
 * Роли (personRoles, characterRoles) получаем через REST API /api/animes/{id}/roles
 * вместо GraphQL — GraphQL возвращает 404 для аниме с большим количеством персонажей (Re:Zero и т.д.)
 */
export async function getAnimeExtended(shikimoriId: number): Promise<ShikimoriAnimeExtended | null> {
  const cacheKey = `extended:${shikimoriId}`

  // Проверяем кэш
  const cached = getCached<ShikimoriAnimeExtended | null>(cacheKey)
  if (cached !== CACHE_MISS) {
    return cached
  }

  // GraphQL без personRoles/characterRoles — не вызывает 404 даже для больших аниме
  const data = await executeQuery<ShikimoriExtendedNoRolesResponse>(GET_ANIME_EXTENDED_NO_ROLES_QUERY, {
    ids: String(shikimoriId),
  })

  const base = data?.animes?.[0] ?? null
  if (!base) {
    setCache(cacheKey, null)
    return null
  }

  // Роли через REST API — избегаем 404 GraphQL для аниме с большим числом персонажей
  let personRoles: ShikimoriAnimeExtended['personRoles'] = []
  let characterRoles: ShikimoriAnimeExtended['characterRoles'] = []
  try {
    const { getAnimeRoles } = await import('./anime-api.js')
    const roles = await getAnimeRoles(shikimoriId)
    personRoles = roles.personRoles
    characterRoles = roles.characterRoles
  } catch (error) {
    log.warn('Не удалось получить роли через REST API, продолжаем без них', {
      shikimoriId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const result: ShikimoriAnimeExtended = { ...base, personRoles, characterRoles }

  // Сохраняем в кэш
  setCache(cacheKey, result)

  return result
}

/**
 * Определить MIME-тип по расширению
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }
  return mimeTypes[ext.toLowerCase()] || 'image/jpeg'
}

/**
 * Скачать постер и сохранить локально
 * Также извлекает метаданные (размеры, blur placeholder)
 * Все операции асинхронные — не блокируют main thread
 *
 * @param posterUrl URL постера на Shikimori
 * @param animeId ID аниме (для имени файла)
 * @param options.fileName Кастомное имя файла
 * @param options.savePath Путь к папке для сохранения (если не передан — AppData/posters)
 */
export async function downloadPoster(
  posterUrl: string,
  animeId: string,
  options?: { fileName?: string; savePath?: string },
): Promise<PosterDownloadResult> {
  log.debug('Скачивание постера', { posterUrl, animeId })

  try {
    // Папка для постеров:
    // - savePath если передан (папка аниме в библиотеке)
    // - AppData/posters как fallback (для просмотра метаданных без импорта)
    const postersDir = options?.savePath || path.join(app.getPath('userData'), 'posters')

    // Создать папку если нет (асинхронно, recursive: true не бросает ошибку если существует)
    await fs.promises.mkdir(postersDir, { recursive: true })

    // Имя файла
    const ext = path.extname(new URL(posterUrl).pathname) || '.jpg'
    const finalFileName = options?.fileName || (options?.savePath ? `poster${ext}` : `${animeId}${ext}`)
    const localPath = path.join(postersDir, finalFileName)

    // Глобальный throttle — координация со всеми Shikimori-запросами
    await acquireShikimoriSlot()

    // Скачать файл через fetch с браузерными заголовками (DDoS-Guard).
    // Node fetch, не net.fetch — см. комментарий у GRAPHQL_ENDPOINTS выше (TUN-VPN режет
    // именно Chromium-стек по TLS-отпечатку, обычный Node-сокет проходит).
    const DOWNLOAD_TIMEOUT = 15_000
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT)

    try {
      const response = await fetch(posterUrl, {
        signal: controller.signal,
        headers: SHIKIMORI_BROWSER_HEADERS,
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`Poster download failed: ${response.status} ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      await fs.promises.writeFile(localPath, Buffer.from(arrayBuffer))
    } catch (error) {
      clearTimeout(timeout)
      // Удалить частичный файл
      try {
        await fs.promises.unlink(localPath)
      } catch {
        /* игнорируем ошибку удаления */
      }
      throw error
    }

    // Получить размер файла асинхронно
    const stats = await fs.promises.stat(localPath)
    const size = stats.size

    // Получить размеры изображения через nativeImage
    const image = nativeImage.createFromPath(localPath)
    const imageSize = image.getSize()
    const { width, height } = imageSize

    // Генерируем blur placeholder (10x10 пикселей в base64)
    let blurDataURL: string | undefined
    if (!image.isEmpty()) {
      const blurImage = image.resize({ width: 10, height: 10, quality: 'good' })
      const blurBuffer = blurImage.toJPEG(50) // Качество 50%
      blurDataURL = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`
    }

    log.debug('Постер скачан', { localPath, width, height, size })

    return {
      success: true,
      localPath,
      filename: finalFileName,
      mimeType: getMimeType(ext),
      size,
      width,
      height,
      blurDataURL,
    }
  } catch (error) {
    return {
      success: false,
      error: await describeNetErrorWithDiagnostics(error, posterUrl),
    }
  }
}
