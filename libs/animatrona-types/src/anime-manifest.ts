/**
 * AnimeManifest — Данные раздачи аниме в IPFS
 *
 * Иерархия документов:
 *   PublishedLibrary → AnimeManifest → {
 *     animeInfoCid → AnimeInfo (метаданные)
 *     episodesCid → EpisodesDocument (список эпизодов)
 *     franchiseGraphCid → FranchiseGraphDocument (граф франшизы)
 *     relationsCid → RelationsDocument (связи с другими аниме)
 *     episodePreviewsCid → EpisodePreviewsDocument (превью эпизодов)
 *   }
 *
 * Тип описывает union формата v1 (inline-данные) и v2 (только CID-ссылки).
 * В IPFS хранятся документы обоих форматов, поэтому все поля v1 — optional.
 */

// ─── Вспомогательные типы ────────────────────────────────────────────

/** Студия анимации */
export interface AnimeManifestStudio {
  id?: number
  name: string
  /** URL логотипа (legacy, внешняя ссылка) */
  imageUrl?: string
  /** CID логотипа в IPFS */
  imageCid?: string
}

/** Персона (режиссёр, сценарист и т.д.) */
export interface AnimeManifestPerson {
  id?: number
  name: string
  nameRu?: string
  role: string
  /** URL изображения (legacy, внешняя ссылка) */
  imageUrl?: string
  /** CID изображения в IPFS */
  imageCid?: string
}

/** Персонаж */
export interface AnimeManifestCharacter {
  id?: number
  name: string
  nameRu?: string
  role?: string
  /** URL изображения (legacy, внешняя ссылка) */
  imageUrl?: string
  /** CID изображения в IPFS */
  imageCid?: string
  voiceActor?: {
    id?: number
    name: string
    nameRu?: string
  }
}

/** Жанр/Тема */
export interface AnimeManifestGenre {
  name: string
  nameRu?: string
  id?: number
  slug?: string
}

/** Внешние ID для кросс-сервисного поиска */
export interface AnimeManifestExternalIds {
  mal?: number
  anilist?: number
  shikimori?: number
  anidb?: number
  worldArt?: number
  kinopoisk?: number
}

/** Внешняя ссылка */
export interface AnimeManifestExternalLink {
  kind: string
  url: string
}

/** Видео материал (трейлер, опенинг, эндинг) */
export interface AnimeManifestVideo {
  kind: string
  name?: string
  url: string
  imageUrl?: string
}

/** Ссылка на эпизод в AnimeManifest */
export interface AnimeManifestEpisode {
  number: number
  season?: number
  name?: string
  /** CID манифеста эпизода (EpisodeManifest) */
  manifestCid: string
  /** CID транскодированного видео (для быстрого доступа) */
  videoCid?: string
  size: number
  durationMs?: number
}

/** Связь с другим аниме */
export interface AnimeManifestRelation {
  targetShikimoriId: number
  relationKind: string
  targetName?: string
  targetYear?: number
  targetKind?: string
  targetPosterUrl?: string
}

// ─── Основной тип ────────────────────────────────────────────────────

/** Версия формата AnimeManifest */
export const ANIME_MANIFEST_VERSION = 1

/**
 * AnimeManifest — Данные раздачи аниме для IPFS
 *
 * v2 формат: только CID-ссылки на вложенные документы.
 * v1 legacy поля (name, year, description, etc.) сохраняются для обратной совместимости.
 */
export interface AnimeManifest {
  version: 1

  /** CID AnimeInfo в IPFS (метаданные аниме). Обязателен в v2, опционален в v1. */
  animeInfoCid?: string

  /** Название (всегда присутствует для поиска) */
  name: string

  // === Поля v1 legacy (inline метаданные, в v2 вынесены в AnimeInfo) ===

  originalName?: string
  nameEn?: string
  synonyms?: string[]
  year?: number
  description?: string
  ageRating?: string
  duration?: number
  episodeCount?: number
  status?: string
  kind?: string
  source?: string
  licensor?: string
  rating?: number
  nextEpisodeAt?: string
  genres?: AnimeManifestGenre[]
  themes?: AnimeManifestGenre[]
  studios?: AnimeManifestStudio[]
  staff?: AnimeManifestPerson[]
  characters?: AnimeManifestCharacter[]
  fandubbers?: string[]
  fansubbers?: string[]
  externalIds?: AnimeManifestExternalIds
  externalLinks?: AnimeManifestExternalLink[]
  videos?: AnimeManifestVideo[]

  // === Эпизоды ===

  /** @deprecated — в v2 используется episodesCid */
  episodes?: AnimeManifestEpisode[]
  /** CID EpisodesDocument в IPFS (v2) */
  episodesCid?: string

  // === Медиа раздачи ===

  posterCid?: string

  // === Вложенные документы ===

  /** CID FranchiseGraphDocument в IPFS */
  franchiseGraphCid?: string
  /** CID RelationsDocument в IPFS */
  relationsCid?: string
  /** CID EpisodePreviewsDocument в IPFS */
  episodePreviewsCid?: string

  // === Метаданные раздачи ===

  isBdRemux?: boolean
  /** URL источника контента (например, страница раздачи на Rutracker) */
  sourceUrl?: string
  creatorPeerId?: string
  createdAt: string
  updatedAt: string

  // === Размер директории (для прогресса пиннинга) ===

  /** Количество IPFS блоков в директории (двухпроходная сборка) */
  directoryBlocks?: number
  /** Размер директории в байтах (двухпроходная сборка) */
  directorySize?: number
}

// ─── Вложенные документы ─────────────────────────────────────────────

/** Отдельный IPFS-документ со списком эпизодов (episodesCid → этот JSON) */
export interface EpisodesDocument {
  version: 1
  episodes: AnimeManifestEpisode[]
}

/** IPFS-документ со связями аниме (relationsCid → этот JSON) */
export interface RelationsDocument {
  version: 1
  relations: AnimeManifestRelation[]
}

// ─── Граф франшизы ───────────────────────────────────────────────────

/** Узел графа франшизы (аниме) */
export interface FranchiseGraphNode {
  /** Shikimori ID */
  id: number
  /** Название */
  name: string
  /** Тип (tv, movie, ova, ona, special, music) */
  kind: string
  /** Год выпуска */
  year: number | null
  /** URL постера */
  image_url: string
  /** URL на Shikimori */
  url: string
  /** Вес узла (размер в графе) */
  weight: number
}

/** Связь между узлами графа франшизы */
export interface FranchiseGraphLink {
  source_id: number
  target_id: number
  relation: string
  weight: number
}

/** IPFS-документ с полным графом франшизы (franchiseGraphCid → этот JSON) */
export interface FranchiseGraphDocument {
  version: 1
  /** Минимальный shikimoriId из графа (стабильный ключ франшизы) */
  rootShikimoriId: number
  name: string
  nodes: FranchiseGraphNode[]
  links: FranchiseGraphLink[]
}

// ─── Превью эпизодов ─────────────────────────────────────────────────

/** Превью эпизода (thumbnail'ы 320px + скриншоты 1280px) */
export interface EpisodePreview {
  number: number
  thumbnailCids: string[]
  screenshotCids: string[]
}

/** IPFS-документ с превью эпизодов (episodePreviewsCid → этот JSON) */
export interface EpisodePreviewsDocument {
  version: 1
  previews: EpisodePreview[]
}
