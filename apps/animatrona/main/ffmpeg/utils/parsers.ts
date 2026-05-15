/**
 * Утилиты для парсинга данных FFmpeg/FFprobe
 */

/**
 * Типизация потока для extractBitrate
 * Поддерживает структуру FFprobe JSON output
 */
export interface StreamWithBitrate {
  bit_rate?: string
  tags?: Record<string, string | undefined>
}

/**
 * Извлечь битрейт из потока — проверяет несколько мест
 * MKV контейнеры часто хранят битрейт в тегах вместо стандартного поля
 *
 * Проверяет в порядке приоритета:
 * 1. stream.bit_rate — стандартное поле
 * 2. tags.BPS — часто в MKV
 * 3. tags.BPS-eng — с языковым суффиксом
 * 4. Любой тег с BPS в названии
 *
 * @param stream - Объект потока из FFprobe
 * @returns Битрейт в bps или undefined
 */
export function extractBitrate(stream: StreamWithBitrate): number | undefined {
  // 1. Прямо в stream.bit_rate
  if (stream.bit_rate) {
    const br = parseInt(stream.bit_rate, 10)
    if (br > 0) {
      return br
    }
  }

  // 2. В тегах BPS (часто в MKV)
  if (stream.tags?.BPS) {
    const br = parseInt(stream.tags.BPS, 10)
    if (br > 0) {
      return br
    }
  }

  // 3. В тегах BPS-eng
  if (stream.tags?.['BPS-eng']) {
    const br = parseInt(stream.tags['BPS-eng'], 10)
    if (br > 0) {
      return br
    }
  }

  // 4. Поиск любого тега с BPS в названии
  if (stream.tags) {
    for (const [key, value] of Object.entries(stream.tags)) {
      if (key.toUpperCase().includes('BPS') && value) {
        const br = parseInt(value, 10)
        if (br > 0) {
          return br
        }
      }
    }
  }

  return undefined
}

/**
 * Получить битность цвета из формата пикселей
 *
 * @example getBitDepth('yuv420p10le') → 10
 * @example getBitDepth('yuv420p') → 8
 * @example getBitDepth('yuv444p12le') → 12
 *
 * @param pixelFormat - Формат пикселей из FFprobe (pix_fmt)
 * @returns Битность (8, 10 или 12)
 */
export function getBitDepth(pixelFormat?: string): number {
  if (!pixelFormat) {
    return 8
  }
  if (pixelFormat.includes('12')) {
    return 12
  }
  if (pixelFormat.includes('10')) {
    return 10
  }
  return 8
}

/**
 * Парсинг времени из вывода FFmpeg
 *
 * Формат FFmpeg: "time=00:01:30.50" или "time=01:30.50"
 *
 * @param str - Строка из stderr FFmpeg
 * @returns Время в секундах или null если не найдено
 */
export function parseTimeToSeconds(str: string): number | null {
  const match = str.match(/time=(\d+):(\d+):(\d+)\.(\d+)/)
  if (!match) {
    return null
  }

  const [, hours, minutes, seconds, hundredths] = match
  return (
    parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10) + parseInt(hundredths, 10) / 100
  )
}

/**
 * Определяет, нужно ли транскодировать аудиодорожку
 *
 * Используется в режиме 'smart' для оптимизации demux:
 * - MP3 — никогда не транскодировать (lossy-to-lossy ухудшает качество)
 * - AAC ≤256 kbps — не перекодировать
 * - Все остальные (FLAC, Opus, WAV, высокий AAC) — транскодировать
 *
 * @param codec - Название кодека (mp3, aac, flac, opus, etc.)
 * @param bitrate - Битрейт в bps или null
 * @returns true если нужно транскодировать
 */
export function needsAudioTranscode(codec: string, bitrate: number | null): boolean {
  const lowerCodec = codec.toLowerCase()

  // MP3 — никогда не транскодировать
  if (lowerCodec === 'mp3') {
    return false
  }

  // AAC с битрейтом ≤ 256 kbps — не нужно перекодировать
  if (lowerCodec === 'aac' && bitrate && bitrate > 0 && bitrate <= 256000) {
    return false
  }

  // Все остальные — транскодировать
  return true
}
