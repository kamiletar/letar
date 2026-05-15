/**
 * AnimeInfo — Неизменяемые метаданные аниме для IPFS (desktop)
 *
 * Реэкспортирует shared тип из @letar/animatrona-types
 * и добавляет desktop-specific типы для генерации.
 */

// ─── Реэкспорт shared типов ────────────────────────────────────────

export { ANIME_INFO_VERSION } from '@letar/animatrona-types'
export type { AnimeInfo } from '@letar/animatrona-types'

// ─── Desktop-specific типы ─────────────────────────────────────────

/**
 * Результат генерации AnimeInfo
 */
export interface GenerateAnimeInfoResult {
  success: boolean
  /** CID AnimeInfo в IPFS */
  animeInfoCid?: string
  /** Сгенерированный AnimeInfo */
  animeInfo?: import('@letar/animatrona-types').AnimeInfo
  /** Сообщение об ошибке */
  error?: string
}
