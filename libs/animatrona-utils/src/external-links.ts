/**
 * Маппинг externalIds → URL на внешние сайты.
 *
 * Единая версия для tracker и web.
 */

import type { AnimeManifestExternalIds } from '@letar/animatrona-types'

/** Запись внешней ссылки */
export interface ExternalLinkEntry {
  /** Название сервиса */
  name: string
  /** URL */
  url: string
  /** Цвет бейджа Chakra (colorPalette) */
  colorPalette: string
}

/**
 * Генерация ссылок из externalIds манифеста.
 * Также принимает shikimoriId из БД (fallback если нет в манифесте).
 */
export function buildExternalLinks(
  ids?: AnimeManifestExternalIds | null,
  dbShikimoriId?: number | null,
): ExternalLinkEntry[] {
  const links: ExternalLinkEntry[] = []

  const shikimori = ids?.shikimori ?? dbShikimoriId
  if (shikimori) {
    links.push({
      name: 'Shikimori',
      url: `https://shikimori.one/animes/${shikimori}`,
      colorPalette: 'green',
    })
  }
  if (ids?.mal) {
    links.push({
      name: 'MyAnimeList',
      url: `https://myanimelist.net/anime/${ids.mal}`,
      colorPalette: 'blue',
    })
  }
  if (ids?.anilist) {
    links.push({
      name: 'AniList',
      url: `https://anilist.co/anime/${ids.anilist}`,
      colorPalette: 'cyan',
    })
  }
  if (ids?.anidb) {
    links.push({
      name: 'AniDB',
      url: `https://anidb.net/anime/${ids.anidb}`,
      colorPalette: 'orange',
    })
  }
  if (ids?.kinopoisk) {
    links.push({
      name: 'Кинопоиск',
      url: `https://www.kinopoisk.ru/film/${ids.kinopoisk}`,
      colorPalette: 'yellow',
    })
  }
  if (ids?.worldArt) {
    links.push({
      name: 'World-Art',
      url: `http://www.world-art.ru/animation/animation.php?id=${ids.worldArt}`,
      colorPalette: 'purple',
    })
  }

  return links
}
