/**
 * Утилитарные функции для модуля добавления дорожек
 */

import type { TrackFilterConfig, TrackInfo } from './types'

/** Конфигурация по умолчанию */
export const DEFAULT_TRACK_FILTER: TrackFilterConfig = {
  skipLanguages: ['jpn', 'ja', 'und'],
  takeLanguages: ['eng', 'en', 'rus', 'ru'],
  autoSelectByType: true,
}

/**
 * Проверяет, должен ли трек быть автоматически выбран
 */
export function shouldAutoSelectTrack(track: TrackInfo, config: TrackFilterConfig = DEFAULT_TRACK_FILTER): boolean {
  const lang = track.language.toLowerCase()

  // Пропустить если в списке исключений
  if (config.skipLanguages.some((l) => lang.startsWith(l))) {
    return false
  }

  // Взять если в списке нужных
  return config.takeLanguages.some((l) => lang.startsWith(l))
}

/**
 * Определяет, нужно ли транскодировать аудиодорожку
 * @returns true — нужно транскодировать (lossy высокий битрейт или lossless)
 * @returns false — копировать как есть (MP3 или AAC ≤256kbps)
 */
export function needsAudioTranscode(codec: string, bitrate: number | null): boolean {
  const lowerCodec = codec.toLowerCase()

  // MP3 — никогда не транскодировать (lossy-to-lossy только ухудшает)
  if (lowerCodec === 'mp3') {
    return false
  }

  // AAC с битрейтом ≤ 256 kbps — не нужно
  if (lowerCodec === 'aac' && bitrate && bitrate > 0 && bitrate <= 256000) {
    return false
  }

  // Всё остальное (FLAC, Opus, WAV, высокий AAC) — транскодировать
  return true
}

/**
 * Форматирует количество каналов
 */
export function formatChannels(channels: number | undefined): string {
  if (!channels) {
    return '2.0'
  }
  if (channels === 1) {
    return '1.0'
  }
  if (channels === 2) {
    return '2.0'
  }
  if (channels === 6) {
    return '5.1'
  }
  if (channels === 8) {
    return '7.1'
  }
  return `${channels}.0`
}

/**
 * Параллельная обработка с ограничением concurrency
 * limitRef — ref для динамического изменения количества потоков на лету
 */
export async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T, index: number) => Promise<void>,
  limitRef: React.RefObject<number>,
  isCancelledRef: React.RefObject<boolean>,
): Promise<void> {
  const executing: Promise<void>[] = []

  for (let i = 0; i < items.length; i++) {
    if (isCancelledRef.current) {
      break
    }

    const promise = fn(items[i], i).finally(() => {
      const idx = executing.indexOf(promise)
      if (idx > -1) {
        executing.splice(idx, 1)
      }
    })

    executing.push(promise)

    // Читаем текущий лимит из ref — позволяет менять concurrency на лету
    if (executing.length >= limitRef.current) {
      await Promise.race(executing)
    }
  }

  await Promise.all(executing)
}

/**
 * Начальное количество потоков для добавления/восстановления дорожек
 * 4 — баланс между скоростью и потреблением памяти
 */
export function getInitialConcurrency(): number {
  return 4
}
