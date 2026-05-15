/**
 * @letar/animatrona-types — Shared IPFS document types для Animatrona
 *
 * Каноничные типы для всех IPFS-документов: PublishedLibrary, AnimeManifest,
 * AnimeInfo, EpisodeManifest и их вложенных документов.
 *
 * Zero dependencies. Используется в:
 * - animatrona (desktop) — генерация и чтение
 * - animatrona-web — чтение и отображение
 * - animatrona-mobile — чтение и отображение
 * - animatrona-tv — чтение и отображение
 */

// ─── PublishedLibrary ────────────────────────────────────────────────
export type { PublishedAnime, PublishedEpisode, PublishedLibrary } from './published-library'

// ─── AnimeManifest + вложенные документы ────────────────────────────
export { ANIME_MANIFEST_VERSION } from './anime-manifest'
export type {
  AnimeManifest,
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
} from './anime-manifest'

// ─── AnimeInfo ──────────────────────────────────────────────────────
export { ANIME_INFO_VERSION } from './anime-info'
export type { AnimeInfo } from './anime-info'

// ─── EpisodeManifest + вложенные документы ──────────────────────────
export { MANIFEST_VERSION } from './episode-manifest'
export type {
  ChaptersDocument,
  EncodingDocument,
  EpisodeManifest,
  ManifestAudioTrack,
  ManifestChapter,
  ManifestChapterType,
  ManifestEncodingInfo,
  ManifestInfo,
  ManifestNavigation,
  ManifestSubtitleFont,
  ManifestSubtitleTrack,
  ManifestThumbnails,
  ManifestVideo,
  ThumbnailsDocument,
} from './episode-manifest'
