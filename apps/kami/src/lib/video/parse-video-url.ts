/** Распознанное видео с провайдера, поддерживающего embed без ключа API */
export interface ParsedVideoUrl {
  provider: 'youtube' | 'vimeo'
  externalId: string
  embedUrl: string
  thumbnailUrl: string | null
}

const YOUTUBE_RE = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/
const VIMEO_RE = /vimeo\.com\/(\d+)/

/**
 * Распознаёт ссылку на YouTube/Vimeo и достаёт данные для embed-плеера.
 * Без сетевых запросов — только regex по самой ссылке. Для остальных ссылок (не видео-хостинг)
 * возвращает null — они остаются обычными `Link`, не превращаются в `Video`.
 */
export function parseVideoUrl(url: string): ParsedVideoUrl | null {
  const youtubeMatch = url.match(YOUTUBE_RE)
  if (youtubeMatch) {
    const id = youtubeMatch[1]
    return {
      provider: 'youtube',
      externalId: id,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    }
  }

  const vimeoMatch = url.match(VIMEO_RE)
  if (vimeoMatch) {
    const id = vimeoMatch[1]
    return {
      provider: 'vimeo',
      externalId: id,
      embedUrl: `https://player.vimeo.com/video/${id}`,
      // У Vimeo превью без похода в oEmbed API не получить — оставляем плейсхолдер в UI
      thumbnailUrl: null,
    }
  }

  return null
}

/** Восстанавливает embed URL по уже сохранённым `provider`/`externalId` (без повторного regex по ссылке) */
export function buildEmbedUrl(provider: string, externalId: string): string | null {
  if (provider === 'youtube') {
    return `https://www.youtube.com/embed/${externalId}`
  }
  if (provider === 'vimeo') {
    return `https://player.vimeo.com/video/${externalId}`
  }
  return null
}
