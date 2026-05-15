/**
 * Утилиты для работы с media:// протоколом и IPFS URLs
 *
 * Electron блокирует file:// URLs в renderer для безопасности.
 * Используем:
 * - media:// для доступа к локальным файлам
 * - http://localhost:{port}/ipfs/ для IPFS контента через Kubo gateway напрямую
 *
 * Реальный URL Kubo gateway устанавливается через setGatewayBaseUrl()
 * при старте приложения (см. AppShell). Порт 8081 — дефолт для embedded Kubo.
 */

/** Базовый URL Kubo gateway (обновляется при старте IPFS) */
let _gatewayBaseUrl = 'http://127.0.0.1:8081'

/**
 * Установить реальный базовый URL Kubo gateway.
 * Вызывается из AppShell при старте приложения.
 */
export function setGatewayBaseUrl(baseUrl: string | null): void {
  _gatewayBaseUrl = baseUrl ?? 'http://127.0.0.1:8081'
}

/** Получить текущий базовый URL gateway */
export function getGatewayBaseUrl(): string {
  return _gatewayBaseUrl
}

/**
 * Конвертирует локальный путь или file:// URL в media:// URL
 *
 * @example
 * toMediaUrl('C:/Users/test/poster.webp') → 'media://C:/Users/test/poster.webp'
 * toMediaUrl('file:///C:/Users/test/poster.webp') → 'media://C:/Users/test/poster.webp'
 * toMediaUrl(null) → null
 */
export function toMediaUrl(path: string | null | undefined): string | null {
  if (!path) {
    return null
  }

  // Уже media:// URL
  if (path.startsWith('media://')) {
    return path
  }

  // HTTP(S) URL — возвращаем как есть (например, IPFS gateway URL)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // Конвертируем file:// URL в путь
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
interface ToPlayableUrlOptions {
  /** CID в IPFS (приоритетный) */
  cid?: string | null
  /** Локальный путь к файлу */
  path?: string | null
}

/**
 * Преобразовать CID или путь в воспроизводимый URL
 *
 * Приоритет:
 * 1. IPFS CID → http://127.0.0.1:{kuboGatewayPort}/ipfs/{cid}
 * 2. Локальный путь → media://{path}
 *
 * @example
 * ```ts
 * // С CID
 * toPlayableUrl({ cid: 'Qm...', path: '/path/to/file.mp4' })
 * // → 'http://127.0.0.1:8081/ipfs/Qm...'
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
    return `${_gatewayBaseUrl}/ipfs/${cid}`
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
export function getVideoUrl(episode: { transcodedCid?: string | null }): string | null {
  return toPlayableUrl({
    cid: episode.transcodedCid,
  })
}

/**
 * Получить URL для аудиодорожки
 */
export function getAudioUrl(track: { transcodedCid?: string | null }): string | null {
  return toPlayableUrl({
    cid: track.transcodedCid,
  })
}

/**
 * Получить URL для субтитров
 */
export function getSubtitleUrl(track: { fileCid?: string | null }): string | null {
  return toPlayableUrl({
    cid: track.fileCid,
  })
}

/**
 * Получить URL для шрифта
 */
export function getFontUrl(font: { fileCid?: string | null }): string | null {
  return toPlayableUrl({
    cid: font.fileCid,
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
