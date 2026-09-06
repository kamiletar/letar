/**
 * AniList сервис — англоязычный synopsis (`descriptionEn`) и best-effort названия серий
 */

export { clearAniListCache, getAniListDescription } from './client'
export { buildAniListEpisodeNameMap, parseAniListEpisodeTitle } from './episode-names'
export type { AniListMedia, AniListMediaResponse, AniListStreamingEpisode, GetAniListDescriptionParams } from './types'
