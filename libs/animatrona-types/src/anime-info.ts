/**
 * AnimeInfo — Неизменяемые метаданные аниме для IPFS
 *
 * AnimeInfo содержит каноничные, неизменяемые данные об аниме.
 * CID AnimeInfo = каноничный идентификатор аниме.
 *
 * Множество AnimeManifest'ов (раздач) могут ссылаться на один AnimeInfo.
 * Это позволяет:
 * - Идентифицировать одно и то же аниме между разными раздачами
 * - Переиспользовать метаданные (студии, персонал, жанры)
 * - Обнаруживать раздачи одного аниме через externalIds
 */

import type {
  AnimeManifestCharacter,
  AnimeManifestExternalIds,
  AnimeManifestExternalLink,
  AnimeManifestGenre,
  AnimeManifestPerson,
  AnimeManifestStudio,
  AnimeManifestVideo,
} from './anime-manifest'

/** Версия формата AnimeInfo */
export const ANIME_INFO_VERSION = 1

/**
 * AnimeInfo — Неизменяемые метаданные аниме для IPFS
 *
 * Публикуется в IPFS как JSON. CID = каноничный идентификатор аниме.
 * Поля выбраны по критерию неизменяемости — они не меняются после релиза аниме.
 */
export interface AnimeInfo {
  /** Версия формата */
  version: typeof ANIME_INFO_VERSION

  // === Идентификация ===

  /** Русское название (приоритет) */
  name: string
  /** Оригинальное название (японское) */
  originalName?: string
  /** Английское название */
  nameEn?: string
  /** Альтернативные названия */
  synonyms?: string[]
  /** Год выпуска */
  year?: number

  // === Классификация ===

  /** Тип (TV, MOVIE, OVA, ONA, SPECIAL, MUSIC) */
  kind?: string
  /** Возрастной рейтинг (G, PG, PG-13, R-17, R+, Rx) */
  ageRating?: string
  /** Длительность эпизода в минутах */
  duration?: number
  /** Первоисточник (MANGA, LIGHT_NOVEL, ORIGINAL, VISUAL_NOVEL, GAME, etc.) */
  source?: string
  /** Жанры */
  genres?: AnimeManifestGenre[]
  /** Темы */
  themes?: AnimeManifestGenre[]

  // === Статус и параметры ===

  /** Количество эпизодов */
  episodeCount?: number
  /** Статус (ONGOING, COMPLETED, ANNOUNCED) */
  status?: string
  /** Рейтинг на Shikimori (0-10) */
  rating?: number
  /** Лицензиат в РФ */
  licensor?: string
  /** Дата следующего эпизода (ISO string) */
  nextEpisodeAt?: string

  // === Описание ===

  /** Описание */
  description?: string

  // === Производство ===

  /** Студии анимации */
  studios?: AnimeManifestStudio[]
  /** Персонал (режиссёры, сценаристы и т.д.) */
  staff?: AnimeManifestPerson[]
  /** Персонажи */
  characters?: AnimeManifestCharacter[]

  // === Озвучка ===

  /** Команды озвучки (fandub) */
  fandubbers?: string[]
  /** Команды субтитров (fansub) */
  fansubbers?: string[]

  // === Внешние ID (ключ для discovery) ===

  /** Внешние ID для кросс-сервисного поиска */
  externalIds: AnimeManifestExternalIds
  /** Внешние ссылки (MAL, AniDB, официальный сайт и т.д.) */
  externalLinks?: AnimeManifestExternalLink[]

  // === Медиа-материалы ===

  /** Трейлеры, опенинги, эндинги */
  videos?: AnimeManifestVideo[]
}
