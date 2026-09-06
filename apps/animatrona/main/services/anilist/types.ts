/**
 * Типы для AniList GraphQL API
 *
 * Используется как источник англоязычного synopsis (`descriptionEn` в AnimeInfo) — Shikimori
 * отдаёт единственное поле `description`, уже переводное — и, best-effort, англоязычных названий
 * отдельных серий (`Episode.name`), которых у Shikimori нет вообще (см. PLAN.md, аудит
 * directoryCid, Блокер 3).
 */

/** Один элемент `Media.streamingEpisodes` — эпизод с площадки легального стриминга */
export interface AniListStreamingEpisode {
  /** Обычно `"Episode N - Название"`, формат площадки не гарантирован */
  title: string | null
}

/** Минимальный набор полей AniList Media, нужный для descriptionEn и названий серий */
export interface AniListMedia {
  id: number
  idMal: number | null
  /** Synopsis без HTML-разметки (`description(asHtml: false)`) */
  description: string | null
  /** Список эпизодов со стриминговых площадок (Crunchyroll/HIDIVE/...) — может отсутствовать */
  streamingEpisodes: AniListStreamingEpisode[] | null
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
