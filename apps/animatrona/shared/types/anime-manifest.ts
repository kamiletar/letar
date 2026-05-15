/**
 * AnimeManifest — Типы для IPFS манифестов аниме (desktop)
 *
 * Реэкспортирует shared типы из @letar/animatrona-types
 * и добавляет desktop-specific типы для генерации и импорта.
 *
 * Иерархия документов:
 *   PublishedLibrary → AnimeManifest → {
 *     animeInfoCid → AnimeInfo (метаданные)
 *     episodesCid → EpisodesDocument (список эпизодов)
 *     franchiseGraphCid → FranchiseGraphDocument (граф франшизы)
 *     relationsCid → RelationsDocument (связи с другими аниме)
 *   }
 */

// ─── Реэкспорт shared типов ────────────────────────────────────────

export { ANIME_MANIFEST_VERSION } from '@letar/animatrona-types'
export type {
  AnimeManifestCharacter,
  AnimeManifestEpisode,
  AnimeManifestExternalIds,
  AnimeManifestExternalLink,
  AnimeManifestGenre,
  AnimeManifestPerson,
  AnimeManifestRelation,
  AnimeManifestStudio,
  AnimeManifestVideo,
  EpisodePreview,
  EpisodePreviewsDocument,
  EpisodesDocument,
  FranchiseGraphDocument,
  FranchiseGraphLink,
  FranchiseGraphNode,
  RelationsDocument,
} from '@letar/animatrona-types'

import type { AnimeManifest as SharedAnimeManifest } from '@letar/animatrona-types'

// ─── Desktop AnimeManifest (v2 строгий формат) ─────────────────────

/**
 * AnimeManifest — Данные раздачи аниме для IPFS (desktop v2)
 *
 * Строгий формат: animeInfoCid и episodesCid обязательны.
 * Все метаданные аниме (описание, студии, персонал, жанры и т.д.)
 * хранятся в AnimeInfo, на который ссылается animeInfoCid.
 *
 * Для чтения v1+v2 манифестов из IPFS используй SharedAnimeManifest
 * из @letar/animatrona-types (все поля optional).
 */
export interface AnimeManifest {
  /** Версия формата */
  version: 1

  /** CID AnimeInfo в IPFS (метаданные аниме) — обязателен в v2 */
  animeInfoCid: string

  /** Название (для поиска и отображения в списке) */
  name: string

  // === Эпизоды ===

  /** CID EpisodesDocument в IPFS (список эпизодов) — обязателен в v2 */
  episodesCid: string

  // === Медиа раздачи ===

  /** CID постера в IPFS */
  posterCid?: string

  // === Франшиза и связи ===

  /** CID FranchiseGraphDocument в IPFS (полный граф франшизы) */
  franchiseGraphCid?: string

  /** CID RelationsDocument в IPFS (связи с другими аниме) */
  relationsCid?: string

  /** CID EpisodePreviewsDocument в IPFS (превью эпизодов для карточек) */
  episodePreviewsCid?: string

  // === Метаданные раздачи ===

  /** BDRemux / Bluray Remux (lossless качество) */
  isBdRemux?: boolean
  /** PeerId создателя манифеста */
  creatorPeerId?: string
  /** Дата создания (ISO string) */
  createdAt: string
  /** Дата обновления (ISO string) */
  updatedAt: string
}

// ─── Desktop-specific типы ─────────────────────────────────────────

/** Shared-тип для чтения v1+v2 манифестов из IPFS (все поля optional) */
export type { SharedAnimeManifest }

/**
 * Данные для генерации AnimeManifest
 *
 * Собирается из БД и метаданных Shikimori.
 */
export interface GenerateAnimeManifestInput {
  /** ID аниме в БД */
  animeId: string
  /** Создавать манифесты эпизодов если их нет */
  createEpisodeManifests?: boolean
  /** PeerId создателя (из Helia) */
  creatorPeerId?: string
  /**
   * Пропустить обращения к Shikimori API и переиспользовать кешированные CID из БД.
   * Используется при batch-регенерации чтобы не накапливать HTTP-соединения в памяти.
   * Если animeInfoCid в БД отсутствует — Shikimori всё равно запрашивается.
   */
  skipShikimoriRefresh?: boolean
}

/**
 * Результат генерации AnimeManifest
 */
export interface GenerateAnimeManifestResult {
  success: boolean
  /** CID манифеста в IPFS */
  manifestCid?: string
  /** true — контент не изменился, директорию перестраивать не нужно */
  unchanged?: boolean
  /** Сгенерированный манифест */
  manifest?: AnimeManifest
  /** Возрастной рейтинг из AnimeInfo (для записи в БД) */
  ageRating?: string
  /** Сообщение об ошибке */
  error?: string
}

/**
 * Результат импорта аниме по CID манифеста
 */
export interface ImportAnimeFromManifestResult {
  success: boolean
  /** ID созданного аниме в БД */
  animeId?: string
  /** Название импортированного аниме */
  animeName?: string
  /** Количество эпизодов */
  episodeCount?: number
  /** Сообщение об ошибке */
  error?: string
}
