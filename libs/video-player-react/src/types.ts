/**
 * Реэкспорт типов и констант из @letar/video-player-core
 *
 * Все канонические типы определены в video-player-core.
 * React-пакет реэкспортирует их для удобства потребителей.
 */

// ─── Типы глав ──────────────────────────────────────────────────────

export type { Chapter, ChapterInfo, PlayerChapterType } from '@letar/video-player-core'

// ─── Скорость воспроизведения ────────────────────────────────────────

export { PLAYBACK_SPEEDS, type PlaybackSpeed } from '@letar/video-player-core'

// ─── Аудиодорожки ───────────────────────────────────────────────────

export type { AudioTrackInfo } from '@letar/video-player-core'

// ─── Состояние плеера ───────────────────────────────────────────────

export type { PlayerState } from '@letar/video-player-core'

// ─── Субтитры ───────────────────────────────────────────────────────

/**
 * Формат субтитров для рендеринга в UI плеера
 *
 * @deprecated Используй SubtitleRenderFormat из @letar/video-player-core
 */
export type { SubtitleRenderFormat as SubtitleFormat } from '@letar/video-player-core'

// ─── Константы ──────────────────────────────────────────────────────

export {
  AUDIO_SYNC_THRESHOLD,
  HIDE_CONTROLS_TIMEOUT,
  SKIPPABLE_CHAPTER_TYPES,
  SKIP_LABELS,
  SKIP_TIME,
  VOLUME_STEP,
} from '@letar/video-player-core'
