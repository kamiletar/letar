/**
 * Константы для VideoPlayer
 */

import type { PlayerChapterType } from './types/chapters'

// ─── Контролы ────────────────────────────────────────────────────────

/** Таймаут автоскрытия контролов (мс) */
export const HIDE_CONTROLS_TIMEOUT = 3000

/** Порог синхронизации аудио (сек) */
export const AUDIO_SYNC_THRESHOLD = 0.1

/** Время перемотки по умолчанию (сек) */
export const SKIP_TIME = 10

/** Шаг изменения громкости */
export const VOLUME_STEP = 0.1

// ─── IPFS ────────────────────────────────────────────────────────────

/** Порт локального IPFS gateway */
export const IPFS_GATEWAY_PORT = 8765

// ─── Скорость воспроизведения ────────────────────────────────────────

/** Доступные скорости воспроизведения */
export const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

/** Тип скорости воспроизведения */
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

// ─── Главы ───────────────────────────────────────────────────────────

/** Типы глав, которые можно пропустить */
export const SKIPPABLE_CHAPTER_TYPES = new Set<PlayerChapterType>(['OP', 'ED', 'RECAP', 'PREVIEW'])

/** Названия для кнопки пропуска по типу */
export const SKIP_LABELS: Record<PlayerChapterType, string> = {
  OP: 'Пропустить опенинг',
  ED: 'Пропустить эндинг',
  RECAP: 'Пропустить ретроспективу',
  PREVIEW: 'Пропустить превью',
  CHAPTER: 'Пропустить',
}
