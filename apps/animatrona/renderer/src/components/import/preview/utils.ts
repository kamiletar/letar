/**
 * Утилитные функции для PreviewStep
 */

import type { AudioTrack } from '../../../../../shared/types'

import { formatBitrate, formatBytes, formatChannels, formatDuration } from '@/lib/format-utils'

export { formatBitrate, formatBytes, formatChannels, formatDuration }

/**
 * Получить относительный путь к файлу
 */
export function getRelativePath(fullPath: string, basePath: string): string {
  const normalized = fullPath.replace(/\\/g, '/')
  const normalizedBase = basePath.replace(/\\/g, '/')
  if (normalized.startsWith(normalizedBase)) {
    return normalized.slice(normalizedBase.length).replace(/^\//, '')
  }
  // Fallback: только имя файла
  return fullPath.split(/[/\\]/).pop() || fullPath
}

/**
 * Определяет рекомендацию для аудиодорожки
 */
export function getAudioRecommendation(track: AudioTrack): { action: 'transcode' | 'skip'; reason: string } {
  const codec = (track.codec || 'unknown').toLowerCase()
  const bitrate = track.bitrate || 0

  // AAC с битрейтом ≤ 192 kbps — не нужно транскодировать
  if (codec === 'aac' && bitrate > 0 && bitrate <= 192000) {
    return {
      action: 'skip',
      reason: `AAC ${formatBitrate(bitrate)} — уже оптимально`,
    }
  }

  // Opus — обычно не нужно транскодировать
  if (codec === 'opus') {
    return {
      action: 'skip',
      reason: 'Opus — современный кодек',
    }
  }

  // FLAC, PCM — нужно транскодировать
  if (codec === 'flac' || codec.includes('pcm')) {
    return {
      action: 'transcode',
      reason: `${codec.toUpperCase()} → AAC 192 kbps`,
    }
  }

  // AC3, DTS — высокий битрейт
  if (codec === 'ac3' || codec === 'eac3' || codec === 'dts') {
    return {
      action: 'transcode',
      reason: `${codec.toUpperCase()} ${formatBitrate(bitrate)} → AAC 192 kbps`,
    }
  }

  // AAC с высоким битрейтом
  if (codec === 'aac' && bitrate > 192000) {
    return {
      action: 'transcode',
      reason: `AAC ${formatBitrate(bitrate)} → AAC 192 kbps`,
    }
  }

  // По умолчанию — транскодировать
  return {
    action: 'transcode',
    reason: `${codec.toUpperCase()} → AAC 192 kbps`,
  }
}

/**
 * Получить количество ядер CPU
 */
export function getCpuCount(): number {
  // В Electron доступно через API, но fallback на 4
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency
  }
  return 4
}
