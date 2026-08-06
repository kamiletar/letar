/**
 * Конфигурация IPFS Gateway для Animatrona Tracker
 *
 * Приоритет gateway:
 * 1. Кастомный gateway пользователя (если указан)
 * 2. Дефолтный gateway сайта (NEXT_PUBLIC_IPFS_GATEWAY)
 * 3. Fallback на публичные gateways
 */

/** Список доступных IPFS gateways */
export const IPFS_GATEWAYS = [
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://gateway.letar.best',
  'https://ipfs.io',
  'https://dweb.link',
  'https://cloudflare-ipfs.com',
] as const

/**
 * Настройки пользователя для IPFS
 */
export interface UserIpfsSettings {
  /** Кастомный gateway пользователя */
  customGateway?: string | null
}

/**
 * Получить URL gateway с учётом настроек пользователя
 *
 * @param userSettings - Настройки пользователя (опционально)
 * @returns URL gateway без trailing slash
 */
export function getGateway(userSettings?: UserIpfsSettings): string {
  // 1. Кастомный gateway пользователя (если указан и валидный)
  if (userSettings?.customGateway) {
    try {
      // Валидируем URL
      const url = new URL(userSettings.customGateway)
      return url.origin + url.pathname.replace(/\/$/, '')
    } catch {
      // Невалидный URL, игнорируем
    }
  }

  // 2. Дефолтный gateway
  return (IPFS_GATEWAYS[0] as string).replace(/\/$/, '')
}

/**
 * Получить полный URL для IPFS контента
 *
 * @param cid - IPFS Content ID
 * @param path - Путь внутри директории (опционально)
 * @param userSettings - Настройки пользователя (опционально)
 * @returns Полный URL для доступа к контенту
 *
 * @example
 * getIpfsUrl('QmXxx') // https://gateway.../ipfs/QmXxx
 * getIpfsUrl('QmXxx', 'poster.jpg') // https://gateway.../ipfs/QmXxx/poster.jpg
 */
export function getIpfsUrl(cid: string, path?: string, userSettings?: UserIpfsSettings): string {
  const gateway = getGateway(userSettings)
  // Очистка CID от протокольных префиксов (ipfs://, /ipfs/)
  const cleanCid = cid.replace(/^ipfs:\/\//, '').replace(/^\/ipfs\//, '')
  const fullPath = path ? `/${path}` : ''
  return `${gateway}/ipfs/${cleanCid}${fullPath}`
}

/**
 * Резолвить URL изображения — обрабатывает как ipfs:// URI, так и обычные HTTP URL
 *
 * coverUrl в БД может быть:
 * - `ipfs://QmXxx...` — IPFS URI, нужно преобразовать через gateway
 * - `https://...` — обычный HTTP URL, вернуть как есть
 * - null/undefined — вернуть fallback
 *
 * @param url - URL изображения (может быть ipfs:// или http(s)://)
 * @param fallback - Fallback URL если url пустой (по умолчанию placeholder)
 * @param userSettings - Настройки пользователя (опционально)
 */
export function resolveImageUrl(
  url: string | null | undefined,
  fallback = '/placeholder-poster.png',
  userSettings?: UserIpfsSettings,
): string {
  if (!url) {
    return fallback
  }

  // ipfs:// URI → преобразовать через gateway
  if (url.startsWith('ipfs://')) {
    return getIpfsUrl(url, undefined, userSettings)
  }

  // Обычный URL — вернуть как есть
  return url
}

/**
 * Получить URL видео для плеера
 * IPFS Gateway поддерживает Range requests, что позволяет seek в видео
 *
 * @param cid - IPFS CID видео файла
 * @param userSettings - Настройки пользователя (опционально)
 */
export function getVideoUrl(cid: string, userSettings?: UserIpfsSettings): string {
  return getIpfsUrl(cid, undefined, userSettings)
}

/**
 * Получить URL постера
 *
 * @param cid - IPFS CID постера или директории с poster.jpg
 * @param userSettings - Настройки пользователя (опционально)
 */
export function getPosterUrl(cid: string, userSettings?: UserIpfsSettings): string {
  return getIpfsUrl(cid, undefined, userSettings)
}

/**
 * Проверить доступность gateway
 *
 * @param gatewayUrl - URL gateway для проверки
 * @param timeout - Таймаут в миллисекундах (по умолчанию 5000)
 * @returns true если gateway доступен
 */
export async function checkGatewayHealth(gatewayUrl: string, timeout = 5000): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Пробуем получить известный CID (IPFS welcome page)
    const response = await fetch(`${gatewayUrl}/ipfs/QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG/readme`, {
      method: 'HEAD',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Найти первый доступный gateway из списка
 *
 * @param userSettings - Настройки пользователя (опционально)
 * @returns URL доступного gateway или null
 */
export async function findWorkingGateway(userSettings?: UserIpfsSettings): Promise<string | null> {
  // Сначала проверяем кастомный gateway пользователя
  if (userSettings?.customGateway) {
    const isHealthy = await checkGatewayHealth(userSettings.customGateway)
    if (isHealthy) {
      return userSettings.customGateway
    }
  }

  // Проверяем публичные gateways параллельно — возвращаем первый доступный
  const result = await Promise.any(
    IPFS_GATEWAYS.map(async (gateway) => {
      const isHealthy = await checkGatewayHealth(gateway)
      if (isHealthy) {
        return gateway
      }
      throw new Error('unhealthy')
    }),
  ).catch(() => null)

  return result
}

// Реэкспорт утилит из @letar/animatrona-utils
export {
  formatDuration,
  formatFileSizeRu as formatFileSize,
  formatSeedingTime,
  isValidCid,
} from '@letar/animatrona-utils'
