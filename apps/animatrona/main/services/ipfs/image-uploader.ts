/**
 * Загрузка внешних изображений в IPFS
 *
 * Скачивает картинки с внешних URL (shikimori и т.д.) и загружает в IPFS.
 * Использует in-memory кэш URL→CID для дедупликации в рамках одной сессии.
 * Персистентный кэш (по Shikimori ID) хранится в БД — см. ShikimoriPerson,
 * ShikimoriStudio, ShikimoriCharacter.
 *
 * Особенности:
 * - Rate limiting: 1.5с между запросами к одному хосту (DDoS-Guard защита)
 * - Retry: до 3 попыток с exponential backoff
 * - Браузерные заголовки для обхода DDoS-Guard
 */

import { createModuleLogger } from '../../utils/logger'
import { acquireShikimoriSlot, isShikimoriHost, SHIKIMORI_BROWSER_HEADERS } from '../shikimori/throttle'
import { addBytes } from './unified-ipfs-service'

const log = createModuleLogger('ImageUploader')

/** Минимальный интервал между запросами к НЕ-Shikimori хостам (мс) */
const NON_SHIKIMORI_INTERVAL = 1500

/** Таймаут скачивания одной картинки (мс) */
const DOWNLOAD_TIMEOUT = 20_000

/** Максимальный размер картинки (5 МБ) */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

/** Количество попыток скачивания */
const MAX_RETRIES = 3

/** Базовая задержка для exponential backoff (мс) */
const RETRY_BASE_DELAY = 1000

/** Кэш URL → CID (в рамках жизни процесса, для дедупликации) */
const urlToCidCache = new Map<string, string>()

/** Кэш неудачных URL (чтобы не пытаться повторно в рамках одной сессии) */
const failedUrls = new Set<string>()

/** Время последнего запроса (по хосту) */
const lastRequestByHost = new Map<string, number>()

/**
 * Throttle запросов к одному хосту
 * Shikimori-хосты координируются через глобальный throttle (3с)
 * Остальные хосты — через per-host throttle (1.5с)
 */
async function throttleForHost(url: string): Promise<void> {
  // Shikimori → глобальный throttle (координация с downloadPoster, REST API и т.д.)
  if (isShikimoriHost(url)) {
    await acquireShikimoriSlot()
    return
  }

  // Остальные хосты — локальный per-host throttle
  let host: string
  try {
    host = new URL(url).host
  } catch {
    return
  }

  const lastTime = lastRequestByHost.get(host) ?? 0
  const elapsed = Date.now() - lastTime
  if (elapsed < NON_SHIKIMORI_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, NON_SHIKIMORI_INTERVAL - elapsed))
  }
  lastRequestByHost.set(host, Date.now())
}

/**
 * Задержка для retry с exponential backoff + jitter
 */
async function retryDelay(attempt: number): Promise<void> {
  const delay = RETRY_BASE_DELAY * Math.pow(2, attempt) + Math.random() * 500
  await new Promise((resolve) => setTimeout(resolve, delay))
}

/**
 * Скачивает картинку по URL (одна попытка)
 */
async function downloadImage(url: string): Promise<Buffer | undefined> {
  await throttleForHost(url)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      // Браузерные заголовки для обхода DDoS-Guard (общие из throttle.ts)
      headers: isShikimoriHost(url)
        ? SHIKIMORI_BROWSER_HEADERS
        : {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          },
    })

    clearTimeout(timeout)

    if (!response.ok) {
      log.warn('Не удалось скачать картинку', { url, status: response.status })
      return undefined
    }

    // Проверяем размер по заголовку
    const contentLength = response.headers.get('content-length')
    if (contentLength && Number(contentLength) > MAX_IMAGE_SIZE) {
      log.warn('Картинка слишком большая, пропускаю', { url, size: contentLength })
      return undefined
    }

    const arrayBuffer = await response.arrayBuffer()

    if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
      log.warn('Картинка слишком большая, пропускаю', { url, size: arrayBuffer.byteLength })
      return undefined
    }

    if (arrayBuffer.byteLength === 0) {
      log.warn('Пустая картинка, пропускаю', { url })
      return undefined
    }

    return Buffer.from(arrayBuffer)
  } catch (error) {
    clearTimeout(timeout)
    throw error
  }
}

/**
 * Скачивает картинку по URL и загружает в IPFS
 *
 * @param imageUrl URL изображения (shikimori, myanimelist и т.д.)
 * @returns CID в IPFS или undefined при ошибке
 */
export async function uploadImageToIpfs(imageUrl: string): Promise<string | undefined> {
  if (!imageUrl) {
    return undefined
  }

  // Проверяем in-memory кэш
  const cached = urlToCidCache.get(imageUrl)
  if (cached) {
    return cached
  }

  // Пропускаем ранее неудачные URL
  if (failedUrls.has(imageUrl)) {
    return undefined
  }

  let lastError: unknown

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        log.debug('Повторная попытка скачивания', { url: imageUrl, attempt: attempt + 1 })
        await retryDelay(attempt - 1)
      }

      const buffer = await downloadImage(imageUrl)

      if (!buffer) {
        // downloadImage вернул undefined — не сетевая ошибка, а плохие данные
        failedUrls.add(imageUrl)
        return undefined
      }

      // Загружаем в IPFS
      const cid = await addBytes(buffer)

      // Кэшируем в memory
      urlToCidCache.set(imageUrl, cid)

      log.debug('Картинка загружена в IPFS', {
        url: imageUrl,
        cid,
        size: buffer.length,
        ...(attempt > 0 && { attempts: attempt + 1 }),
      })
      return cid
    } catch (error) {
      lastError = error

      if (error instanceof Error && error.name === 'AbortError') {
        log.warn('Таймаут скачивания картинки', { url: imageUrl, attempt: attempt + 1 })
      } else {
        log.warn('Ошибка загрузки картинки', {
          url: imageUrl,
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : error,
        })
      }
    }
  }

  // Все попытки исчерпаны
  log.warn('Не удалось загрузить картинку после всех попыток', {
    url: imageUrl,
    maxRetries: MAX_RETRIES,
    lastError: lastError instanceof Error ? lastError.message : lastError,
  })

  failedUrls.add(imageUrl)
  return undefined
}

/**
 * Предварительно заполняет in-memory кэш из БД данных
 * Вызывается перед batch-загрузкой чтобы не перекачивать уже известные CID
 */
export function prewarmCache(entries: Array<{ url: string; cid: string }>): void {
  for (const { url, cid } of entries) {
    urlToCidCache.set(url, cid)
  }
  if (entries.length > 0) {
    log.debug('Кэш изображений прогрет из БД', { count: entries.length })
  }
}

/** Статистика кэша */
export function getImageCacheStats(): { size: number; failedCount: number } {
  return { size: urlToCidCache.size, failedCount: failedUrls.size }
}

/** Очистить кэш */
export function clearImageCache(): void {
  urlToCidCache.clear()
  failedUrls.clear()
}
