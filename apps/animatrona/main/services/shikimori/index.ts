/**
 * Shikimori сервис
 * Экспорт публичного API (GraphQL + REST)
 */

export { getAnimeRestData } from './anime-api'
export { downloadPoster, getAnimeDetails, getAnimeExtended, getAnimeWithRelated, searchAnime } from './client'
export { acquireShikimoriSlot, isShikimoriHost, SHIKIMORI_BROWSER_HEADERS } from './throttle'
export type {
  PosterDownloadResult,
  ShikimoriAnimeDetails,
  ShikimoriAnimeExtended,
  ShikimoriAnimePreview,
  ShikimoriAnimeRestResponse,
  ShikimoriAnimeSource,
  ShikimoriAnimeWithRelated,
  ShikimoriCharacter,
  ShikimoriCharacterRole,
  ShikimoriExternalLink,
  // Типы для REST API графа франшизы
  ShikimoriFranchiseGraph,
  ShikimoriFranchiseLink,
  ShikimoriFranchiseNode,
  ShikimoriPerson,
  ShikimoriPersonRole,
  ShikimoriRelatedAnime,
  ShikimoriRelationKind,
  ShikimoriScoreStat,
  ShikimoriSearchOptions,
  ShikimoriStatusStat,
  ShikimoriStudio,
  ShikimoriVideo,
} from './types'
