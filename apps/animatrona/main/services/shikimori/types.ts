/**
 * Типы для Shikimori GraphQL API
 * Документация: https://shikimori.one/api/doc/graphql
 */

/** Статус аниме на Shikimori */
export type ShikimoriAnimeStatus = 'anons' | 'ongoing' | 'released'

/** Тип аниме на Shikimori */
export type ShikimoriAnimeKind = 'tv' | 'movie' | 'ova' | 'ona' | 'special' | 'music'

/** Тип жанра — genre (жанр) или theme (тема) */
export type ShikimoriGenreKind = 'genre' | 'theme'

/** Жанр или тема */
export interface ShikimoriGenre {
  id: string
  name: string
  russian: string
  /** Тип: genre или theme */
  kind: ShikimoriGenreKind
}

/** Постер */
export interface ShikimoriPoster {
  mainUrl: string
  originalUrl: string
}

/** Дата */
export interface ShikimoriDate {
  year: number | null
  month: number | null
  day: number | null
}

/** Базовая информация об аниме (для списка поиска) */
export interface ShikimoriAnimePreview {
  id: string
  name: string
  russian: string | null
  description: string | null
  descriptionHtml: string | null
  score: number | null
  status: ShikimoriAnimeStatus
  kind: ShikimoriAnimeKind | null
  episodes: number
  episodesAired: number
  airedOn: ShikimoriDate | null
  releasedOn: ShikimoriDate | null
  poster: ShikimoriPoster | null
  genres: ShikimoriGenre[]
}

/** Студия анимации */
export interface ShikimoriStudio {
  id: string
  name: string
  imageUrl: string | null
}

/** Персона (сейю, режиссёр и т.д.) */
export interface ShikimoriPerson {
  id: string
  name: string
  russian: string | null
  poster: ShikimoriPoster | null
}

/** Роль персоны в аниме */
export interface ShikimoriPersonRole {
  id: string
  rolesRu: string[]
  rolesEn: string[]
  person: ShikimoriPerson
}

/** Персонаж */
export interface ShikimoriCharacter {
  id: string
  name: string
  russian: string | null
  poster: ShikimoriPoster | null
}

/** Роль персонажа в аниме */
export interface ShikimoriCharacterRole {
  id: string
  rolesRu: string[]
  rolesEn: string[]
  character: ShikimoriCharacter
}

/** Внешняя ссылка */
export interface ShikimoriExternalLink {
  id: string
  kind: string
  url: string
}

/** Видео (трейлер, опенинг, эндинг) — v0.5.3 */
export interface ShikimoriVideo {
  id: string
  url: string
  name: string | null
  kind: string | null
  playerUrl: string | null
  imageUrl: string | null
}

/** Статистика оценок */
export interface ShikimoriScoreStat {
  score: number
  count: number
}

/** Статистика статусов */
export interface ShikimoriStatusStat {
  status: string
  count: number
}

/** Полная информация об аниме */
export interface ShikimoriAnimeDetails extends ShikimoriAnimePreview {
  english: string | null
  japanese: string | null
  synonyms: string[]
  /** Возрастной рейтинг (g, pg, pg_13, r, r_plus, rx) */
  rating: string | null
  /** Длительность эпизода в минутах */
  duration: number | null
  /** Лицензиаторы */
  licensors: string[]
  /** Русское название лицензиата */
  licenseNameRu: string | null
}

/** Расширенная информация об аниме (v0.5.1, v0.5.3 — videos) */
export interface ShikimoriAnimeExtended extends ShikimoriAnimeDetails {
  studios: ShikimoriStudio[]
  personRoles: ShikimoriPersonRole[]
  characterRoles: ShikimoriCharacterRole[]
  fandubbers: string[]
  fansubbers: string[]
  externalLinks: ShikimoriExternalLink[]
  videos: ShikimoriVideo[]
  nextEpisodeAt: string | null
  scoresStats: ShikimoriScoreStat[]
  statusesStats: ShikimoriStatusStat[]
}

/** Ответ на поиск аниме */
export interface ShikimoriSearchResponse {
  animes: ShikimoriAnimePreview[]
}

/** Ответ на получение деталей */
export interface ShikimoriDetailsResponse {
  animes: ShikimoriAnimeDetails[]
}

/** Ответ на получение расширенных метаданных (v0.5.1) */
export interface ShikimoriExtendedResponse {
  animes: ShikimoriAnimeExtended[]
}

/** Расширенная информация аниме без personRoles/characterRoles (для GraphQL fallback) */
export type ShikimoriAnimeExtendedNoRoles = Omit<ShikimoriAnimeExtended, 'personRoles' | 'characterRoles'>

/** Ответ на запрос расширенных метаданных без ролей */
export interface ShikimoriExtendedNoRolesResponse {
  animes: ShikimoriAnimeExtendedNoRoles[]
}

/** Опции поиска */
export interface ShikimoriSearchOptions {
  search: string
  limit?: number
}

/** Результат скачивания постера */
export interface PosterDownloadResult {
  success: boolean
  localPath?: string
  /** Имя файла */
  filename?: string
  /** MIME-тип */
  mimeType?: string
  /** Размер файла в байтах */
  size?: number
  /** Ширина изображения */
  width?: number
  /** Высота изображения */
  height?: number
  /** Base64 blur placeholder для next/image */
  blurDataURL?: string
  error?: string
}

// === Типы для связанных аниме ===

/** Тип связи между аниме на Shikimori */
export type ShikimoriRelationKind =
  | 'sequel'
  | 'prequel'
  | 'side_story'
  | 'parent_story'
  | 'summary'
  | 'full_story'
  | 'spin_off'
  | 'adaptation'
  | 'character'
  | 'alternative_version'
  | 'alternative_setting'
  | 'other'

/** Связанное аниме из GraphQL API */
export interface ShikimoriRelatedAnime {
  id: string
  anime: ShikimoriAnimePreview | null
  manga: null // Игнорируем мангу
  relationKind: ShikimoriRelationKind
  relationText: string
}

/** Аниме с информацией о связях */
export interface ShikimoriAnimeWithRelated {
  id: string
  name: string
  russian: string | null
  /** ID франшизы (строка, например "tondemo_skill_de_isekai_hourou_meshi") */
  franchise: string | null
  poster: ShikimoriPoster | null
  kind: ShikimoriAnimeKind | null
  status: ShikimoriAnimeStatus
  episodes: number
  airedOn: ShikimoriDate | null
  score: number | null
  related: ShikimoriRelatedAnime[]
}

/** Ответ на запрос аниме с связями */
export interface ShikimoriWithRelatedResponse {
  animes: ShikimoriAnimeWithRelated[]
}

// === Типы для REST API графа франшизы ===

/** Узел графа франшизы */
export interface ShikimoriFranchiseNode {
  /** ID аниме на Shikimori */
  id: number
  /** Timestamp даты выхода */
  date: number
  /** Название (русское если есть, иначе оригинальное) */
  name: string
  /** URL постера */
  image_url: string
  /** URL страницы аниме */
  url: string
  /** Год выхода */
  year: number | null
  /** Тип: tv, movie, ova, ona, special, music */
  kind: string
  /** Вес узла для визуализации */
  weight: number
}

/** Связь между узлами графа */
export interface ShikimoriFranchiseLink {
  /** ID связи */
  id: number
  /** ID исходного аниме */
  source_id: number
  /** ID целевого аниме */
  target_id: number
  /** Индекс в массиве nodes (для визуализации) */
  source: number
  /** Индекс в массиве nodes (для визуализации) */
  target: number
  /** Вес связи для визуализации */
  weight: number
  /** Тип связи: sequel, prequel, side_story, etc. */
  relation: ShikimoriRelationKind
}

/** Тип первоисточника аниме */
export type ShikimoriAnimeSource =
  | 'manga'
  | 'light_novel'
  | 'original'
  | 'visual_novel'
  | 'game'
  | 'novel'
  | 'web_manga'
  | 'music'
  | 'other'
  | '4_koma_manga'
  | 'mixed_media'
  | 'picture_book'
  | 'card_game'
  | 'web_novel'
  | 'unknown'

/**
 * Ответ REST API GET /api/animes/{id}
 * Содержит поля, недоступные через GraphQL (например, source)
 */
export interface ShikimoriAnimeRestResponse {
  id: number
  name: string
  russian: string | null
  kind: string | null
  /** Первоисточник (manga, light_novel, original, etc.) */
  source: ShikimoriAnimeSource | null
  score: string
  status: string
  episodes: number
  episodes_aired: number
}

/** Изображение персонажа/персоны из REST API */
export interface ShikimoriRestImage {
  original: string
  preview: string
  x96: string
  x48: string
}

/** Персонаж из REST API ролей */
export interface ShikimoriRestCharacter {
  id: number
  name: string
  russian: string | null
  image: ShikimoriRestImage
  url: string
}

/** Персона из REST API ролей */
export interface ShikimoriRestPerson {
  id: number
  name: string
  russian: string | null
  image: ShikimoriRestImage
  url: string
}

/** Запись из REST API ролей (GET /api/animes/{id}/roles) */
export interface ShikimoriRestRole {
  roles: string[]
  roles_ru: string[]
  character: ShikimoriRestCharacter | null
  person: ShikimoriRestPerson | null
}

/** Результат запроса ролей аниме через REST API */
export interface ShikimoriAnimeRolesResult {
  personRoles: ShikimoriPersonRole[]
  characterRoles: ShikimoriCharacterRole[]
}

/** Ответ REST API /api/animes/{id}/franchise */
export interface ShikimoriFranchiseGraph {
  /** Все аниме в франшизе */
  nodes: ShikimoriFranchiseNode[]
  /** Связи между аниме */
  links: ShikimoriFranchiseLink[]
  /** ID текущего аниме (для которого запрошен граф) */
  current_id: number
}
