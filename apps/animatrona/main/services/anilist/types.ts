/**
 * Типы для AniList GraphQL API
 *
 * Используется только как источник англоязычного synopsis (`descriptionEn` в AnimeInfo) —
 * Shikimori отдаёт единственное поле `description`, уже переводное.
 */

/** Минимальный набор полей AniList Media, нужный для descriptionEn */
export interface AniListMedia {
  id: number
  idMal: number | null
  /** Synopsis без HTML-разметки (`description(asHtml: false)`) */
  description: string | null
}

/** Параметры поиска — хотя бы один из идентификаторов обязателен */
export interface GetAniListDescriptionParams {
  /** ID AniList (`Media.id`) — приоритетнее `malId`, если известен точно */
  anilistId?: number
  /** ID MyAnimeList (`Media.idMal`) — фоллбэк, если прямой ссылки на AniList нет */
  malId?: number
}

/** Ответ GraphQL-запроса `Media` */
export interface AniListMediaResponse {
  Media: AniListMedia | null
}
