/**
 * Утилиты для работы с media:// протоколом и IPFS URLs
 *
 * Electron блокирует file:// URLs в renderer для безопасности.
 * Используем:
 * - media:// для доступа к локальным файлам
 * - http://localhost:8765/ipfs/ для IPFS контента через gateway
 */

import { IPFS_GATEWAY_PORT } from '../constants'

/**
 * Конвертирует локальный путь или file:// URL в media:// URL
 *
 * @example
 * toMediaUrl('C:/Users/test/poster.webp') → 'media://C:/Users/test/poster.webp'
 * toMediaUrl('file:///C:/Users/test/poster.webp') → 'media://C:/Users/test/poster.webp'
 * toMediaUrl(null) → null
 */
export function toMediaUrl(filePath: string | null | undefined): string | null {
  if (!filePath) {
    return null
  }

  // Уже media:// URL
  if (filePath.startsWith('media://')) {
    return filePath
  }

  // Конвертируем file:// URL в путь
  let path = filePath
  if (path.startsWith('file:///')) {
    path = path.slice(8) // Убираем 'file:///'
  } else if (path.startsWith('file://')) {
    path = path.slice(7) // Убираем 'file://'
  }

  // Создаём media:// URL
  return `media://${path}`
}

/**
 * Опции для toPlayableUrl
 */
export interface ToPlayableUrlOptions {
  /** CID в IPFS (приоритетный) */
  cid?: string | null
  /** Локальный путь к файлу */
  path?: string | null
}

/**
 * Преобразовать CID или путь в воспроизводимый URL
 *
 * Приоритет:
 * 1. IPFS CID → http://localhost:8765/ipfs/{cid}
 * 2. Локальный путь → media://{path}
 *
 * @example
 * ```ts
 * // С CID
 * toPlayableUrl({ cid: 'Qm...', path: '/path/to/file.mp4' })
 * // → 'http://localhost:8765/ipfs/Qm...'
 *
 * // Без CID
 * toPlayableUrl({ path: '/path/to/file.mp4' })
 * // → 'media:///path/to/file.mp4'
 *
 * // Уже HTTP URL
 * toPlayableUrl({ path: 'http://example.com/video.mp4' })
 * // → 'http://example.com/video.mp4'
 * ```
 */
export function toPlayableUrl(options: ToPlayableUrlOptions): string | null {
  const { cid, path } = options

  // Приоритет 1: IPFS CID
  if (cid) {
    return `http://localhost:${IPFS_GATEWAY_PORT}/ipfs/${cid}`
  }

  // Приоритет 2: Локальный путь
  if (path) {
    // Уже HTTP URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }

    // Уже media:// URL
    if (path.startsWith('media://')) {
      return path
    }

    // Конвертируем Windows пути (backslash → forward slash)
    const normalizedPath = path.replace(/\\/g, '/')

    return `media://${normalizedPath}`
  }

  return null
}

/**
 * Получить URL для видео эпизода
 */
export function getVideoUrl(episode: { transcodedCid?: string | null; transcodedPath?: string | null }): string | null {
  return toPlayableUrl({
    cid: episode.transcodedCid,
    path: episode.transcodedPath,
  })
}

/**
 * Получить URL для аудиодорожки
 */
export function getAudioUrl(track: { transcodedCid?: string | null; transcodedPath?: string | null }): string | null {
  return toPlayableUrl({
    cid: track.transcodedCid,
    path: track.transcodedPath,
  })
}

/**
 * Получить URL для субтитров
 */
export function getSubtitleUrl(track: { fileCid?: string | null; filePath?: string | null }): string | null {
  return toPlayableUrl({
    cid: track.fileCid,
    path: track.filePath,
  })
}

/**
 * Получить URL для шрифта
 */
export function getFontUrl(font: { fileCid?: string | null; filePath?: string | null }): string | null {
  return toPlayableUrl({
    cid: font.fileCid,
    path: font.filePath,
  })
}

/**
 * Получить URL'ы для массива CID или путей
 */
export function getMediaUrls(items: Array<{ cid?: string | null; path?: string | null }>): string[] {
  return items
    .map((item) => toPlayableUrl({ cid: item.cid, path: item.path }))
    .filter((url): url is string => url !== null)
}

/**
 * Проверить, использует ли URL IPFS
 */
export function isIpfsUrl(url: string): boolean {
  return url.includes('/ipfs/')
}

/**
 * Извлечь CID из IPFS URL
 */
export function extractCidFromUrl(url: string): string | null {
  const match = url.match(/\/ipfs\/([^/]+)/)
  return match ? match[1] : null
}
