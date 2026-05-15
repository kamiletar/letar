/**
 * Вспомогательные функции для импорта
 * Чистые функции без зависимостей
 *
 * Портированы из renderer/src/lib/import/helpers.ts
 */

import type { AnimeStatus, SeasonType } from '../../../renderer/src/generated/prisma'

/**
 * Ограничитель параллельных операций (простая реализация p-limit)
 */
export function createConcurrencyLimiter(concurrency: number) {
  const queue: Array<() => void> = []
  let activeCount = 0

  const next = () => {
    if (queue.length > 0 && activeCount < concurrency) {
      activeCount++
      const fn = queue.shift()
      if (fn) {
        fn()
      }
    }
  }

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        } finally {
          activeCount--
          next()
        }
      }

      queue.push(run)
      next()
    })
  }
}

/**
 * Формирует полный URL постера Shikimori
 */
export function getPosterUrl(mainUrl: string | undefined | null): string | null {
  if (!mainUrl) {
    return null
  }
  // Уже полный URL
  if (mainUrl.startsWith('http://') || mainUrl.startsWith('https://')) {
    // Shikimori может вернуть URL с shikimori.io — заменяем на shikimori.one
    return mainUrl.replace('https://shikimori.io/', 'https://shikimori.one/')
  }
  // Относительный путь — добавляем домен
  const path = mainUrl.startsWith('/') ? mainUrl : `/${mainUrl}`
  return `https://shikimori.one${path}`
}

/**
 * Проверяет, нужно ли транскодировать аудиодорожку
 */
export function needsAudioTranscode(codec: string, bitrate: number | null | undefined): boolean {
  const lowerCodec = codec.toLowerCase()

  if (lowerCodec === 'mp3') {
    return false
  }

  if (lowerCodec === 'aac' && bitrate && bitrate > 0 && bitrate <= 256000) {
    return false
  }

  return true
}

/**
 * Форматирует количество каналов в строку
 */
export function formatChannels(channels: number): string {
  switch (channels) {
    case 1:
      return '1.0'
    case 2:
      return '2.0'
    case 6:
      return '5.1'
    case 8:
      return '7.1'
    default:
      return `${channels}.0`
  }
}

/**
 * Преобразует статус Shikimori в статус БД
 */
export function mapShikimoriStatus(status: string): AnimeStatus {
  switch (status) {
    case 'ongoing':
      return 'ONGOING'
    case 'released':
      return 'COMPLETED'
    case 'anons':
      return 'ANNOUNCED'
    default:
      return 'ONGOING'
  }
}

/**
 * Преобразует тип аниме Shikimori в тип сезона
 */
export function mapSeasonType(kind: string | null): SeasonType {
  if (!kind) {
    return 'TV'
  }
  switch (kind) {
    case 'tv':
      return 'TV'
    case 'ova':
      return 'OVA'
    case 'ona':
      return 'ONA'
    case 'movie':
      return 'MOVIE'
    case 'special':
      return 'SPECIAL'
    default:
      return 'TV'
  }
}

/**
 * Определяет тип главы по названию
 */
export function detectChapterType(title: string | null): 'op' | 'ed' | 'recap' | 'preview' | 'chapter' {
  if (!title) {
    return 'chapter'
  }
  const lowerTitle = title.toLowerCase()

  if (lowerTitle.includes('open') || lowerTitle.includes('op')) {
    return 'op'
  }
  if (lowerTitle.includes('end') || lowerTitle.includes('ed')) {
    return 'ed'
  }
  if (lowerTitle.includes('recap') || lowerTitle.includes('previous')) {
    return 'recap'
  }
  if (lowerTitle.includes('preview') || lowerTitle.includes('next')) {
    return 'preview'
  }

  return 'chapter'
}

/**
 * Определяет, можно ли пропустить главу
 */
export function isChapterSkippable(title: string | null): boolean {
  const type = detectChapterType(title)
  return type === 'op' || type === 'ed' || type === 'recap' || type === 'preview'
}

/**
 * Построить имя файла для аудио/субтитров
 */
export function buildTrackFileName(language: string, dubGroup: string | null | undefined, ext: string): string {
  if (dubGroup) {
    const sanitized = dubGroup.replace(/[\s/\\:*?"<>|]+/g, '_')
    return `${language}_${sanitized}.${ext}`
  }
  return `${language}.${ext}`
}
