/**
 * Shikimori Mapper — Маппинг данных из Shikimori API в формат манифеста
 *
 * Каждая функция проверяет БД-кэш (ShikimoriStudio/Person/Character)
 * и скачивает только те изображения, которых ещё нет.
 */

import type {
  AnimeManifestCharacter,
  AnimeManifestExternalIds,
  AnimeManifestExternalLink,
  AnimeManifestPerson,
  AnimeManifestStudio,
  AnimeManifestVideo,
} from '../../shared/types/anime-manifest'
import { prisma } from '../utils/db'
import { prewarmCache, uploadImageToIpfs } from './ipfs/image-uploader'
import type { ShikimoriAnimeExtended } from './shikimori/types'

/**
 * Конвертирует студии из Shikimori в формат манифеста
 * Использует БД-кэш ShikimoriStudio для imageCid
 */
export async function mapStudios(shikimori: ShikimoriAnimeExtended): Promise<AnimeManifestStudio[] | undefined> {
  if (!shikimori.studios || shikimori.studios.length === 0) {
    return undefined
  }

  const shikimoriIds = shikimori.studios.map((s) => Number(s.id))

  // Загружаем кэш из БД
  const cached = await prisma.shikimoriStudio.findMany({
    where: { shikimoriId: { in: shikimoriIds } },
  })
  const cacheMap = new Map(cached.map((c) => [c.shikimoriId, c]))

  // Прогреваем in-memory кэш image-uploader
  prewarmCache(
    cached
      .filter((c): c is typeof c & { imageUrl: string; imageCid: string } => Boolean(c.imageUrl && c.imageCid))
      .map((c) => ({ url: c.imageUrl, cid: c.imageCid })),
  )

  const results: AnimeManifestStudio[] = []

  for (const s of shikimori.studios) {
    const sid = Number(s.id)
    const imageUrl = s.imageUrl ?? undefined
    const dbEntry = cacheMap.get(sid)

    // Если CID уже есть в БД — используем
    let imageCid = dbEntry?.imageCid ?? undefined
    if (!imageCid && imageUrl) {
      imageCid = (await uploadImageToIpfs(imageUrl)) ?? undefined
    }

    // Upsert в БД
    await prisma.shikimoriStudio.upsert({
      where: { shikimoriId: sid },
      create: { shikimoriId: sid, name: s.name, imageUrl, imageCid },
      update: { name: s.name, imageUrl, ...(imageCid && { imageCid }) },
    })

    results.push({ id: sid, name: s.name, imageUrl, imageCid })
  }

  return results
}

/**
 * Конвертирует персонал (режиссёры, сценаристы) из Shikimori в формат манифеста
 * Использует БД-кэш ShikimoriPerson для imageCid
 */
export async function mapStaff(shikimori: ShikimoriAnimeExtended): Promise<AnimeManifestPerson[] | undefined> {
  if (!shikimori.personRoles || shikimori.personRoles.length === 0) {
    return undefined
  }

  const shikimoriIds = shikimori.personRoles.map((pr) => Number(pr.person.id))

  // Загружаем кэш из БД
  const cached = await prisma.shikimoriPerson.findMany({
    where: { shikimoriId: { in: shikimoriIds } },
  })
  const cacheMap = new Map(cached.map((c) => [c.shikimoriId, c]))

  // Прогреваем in-memory кэш
  prewarmCache(
    cached
      .filter((c): c is typeof c & { imageUrl: string; imageCid: string } => Boolean(c.imageUrl && c.imageCid))
      .map((c) => ({ url: c.imageUrl, cid: c.imageCid })),
  )

  const results: AnimeManifestPerson[] = []

  for (const pr of shikimori.personRoles) {
    const pid = Number(pr.person.id)
    const imageUrl = pr.person.poster?.mainUrl ?? undefined
    const nameRu = pr.person.russian ?? undefined
    const dbEntry = cacheMap.get(pid)

    let imageCid = dbEntry?.imageCid ?? undefined
    if (!imageCid && imageUrl) {
      imageCid = (await uploadImageToIpfs(imageUrl)) ?? undefined
    }

    // Upsert в БД
    await prisma.shikimoriPerson.upsert({
      where: { shikimoriId: pid },
      create: { shikimoriId: pid, name: pr.person.name, nameRu, imageUrl, imageCid },
      update: { name: pr.person.name, nameRu, imageUrl, ...(imageCid && { imageCid }) },
    })

    results.push({
      id: pid,
      name: pr.person.name,
      nameRu,
      role: pr.rolesRu?.[0] ?? pr.rolesEn?.[0] ?? 'Staff',
      imageUrl,
      imageCid,
    })
  }

  return results
}

/**
 * Конвертирует персонажей из Shikimori в формат манифеста
 * Использует БД-кэш ShikimoriCharacter для imageCid
 */
export async function mapCharacters(shikimori: ShikimoriAnimeExtended): Promise<AnimeManifestCharacter[] | undefined> {
  if (!shikimori.characterRoles || shikimori.characterRoles.length === 0) {
    return undefined
  }

  const shikimoriIds = shikimori.characterRoles.map((cr) => Number(cr.character.id))

  // Загружаем кэш из БД
  const cached = await prisma.shikimoriCharacter.findMany({
    where: { shikimoriId: { in: shikimoriIds } },
  })
  const cacheMap = new Map(cached.map((c) => [c.shikimoriId, c]))

  // Прогреваем in-memory кэш
  prewarmCache(
    cached
      .filter((c): c is typeof c & { imageUrl: string; imageCid: string } => Boolean(c.imageUrl && c.imageCid))
      .map((c) => ({ url: c.imageUrl, cid: c.imageCid })),
  )

  const results: AnimeManifestCharacter[] = []

  for (const cr of shikimori.characterRoles) {
    const charId = Number(cr.character.id)
    const imageUrl = cr.character.poster?.mainUrl ?? undefined
    const nameRu = cr.character.russian ?? undefined
    const dbEntry = cacheMap.get(charId)

    let imageCid = dbEntry?.imageCid ?? undefined
    if (!imageCid && imageUrl) {
      imageCid = (await uploadImageToIpfs(imageUrl)) ?? undefined
    }

    // Upsert в БД
    await prisma.shikimoriCharacter.upsert({
      where: { shikimoriId: charId },
      create: { shikimoriId: charId, name: cr.character.name, nameRu, imageUrl, imageCid },
      update: { name: cr.character.name, nameRu, imageUrl, ...(imageCid && { imageCid }) },
    })

    results.push({
      id: charId,
      name: cr.character.name,
      nameRu,
      role: cr.rolesRu?.[0] ?? cr.rolesEn?.[0] ?? undefined,
      imageUrl,
      imageCid,
      // Примечание: в GraphQL API нет данных о сейю в characterRoles
      // Они есть только в personRoles с ролью "сейю" (seiyuu)
    })
  }

  return results
}

/**
 * Конвертирует внешние ссылки из Shikimori в формат манифеста
 */
export function mapExternalLinks(shikimori: ShikimoriAnimeExtended): AnimeManifestExternalLink[] | undefined {
  if (!shikimori.externalLinks || shikimori.externalLinks.length === 0) {
    return undefined
  }
  return shikimori.externalLinks.map((link) => ({
    kind: link.kind,
    url: link.url,
  }))
}

/**
 * Конвертирует видео (трейлеры, OP, ED) из Shikimori в формат манифеста
 */
export function mapVideos(shikimori: ShikimoriAnimeExtended): AnimeManifestVideo[] | undefined {
  if (!shikimori.videos || shikimori.videos.length === 0) {
    return undefined
  }
  return shikimori.videos.map((v) => ({
    kind: v.kind ?? 'pv',
    name: v.name ?? undefined,
    url: v.playerUrl ?? v.url,
    imageUrl: v.imageUrl ?? undefined,
  }))
}

/**
 * Извлекает внешние ID из ссылок Shikimori
 */
export function extractExternalIds(
  shikimoriId: number | null | undefined,
  externalLinks: ShikimoriAnimeExtended['externalLinks'] | undefined,
): AnimeManifestExternalIds {
  const ids: AnimeManifestExternalIds = {}

  if (shikimoriId) {
    ids.shikimori = shikimoriId
  }

  if (externalLinks) {
    for (const link of externalLinks) {
      // Извлекаем MAL ID из ссылки типа myanimelist
      if (link.kind === 'myanimelist' && link.url) {
        const malMatch = link.url.match(/myanimelist\.net\/anime\/(\d+)/)
        if (malMatch) {
          ids.mal = Number.parseInt(malMatch[1], 10)
        }
      }
      // AniList
      if (link.kind === 'anilist' && link.url) {
        const anilistMatch = link.url.match(/anilist\.co\/anime\/(\d+)/)
        if (anilistMatch) {
          ids.anilist = Number.parseInt(anilistMatch[1], 10)
        }
      }
      // AniDB
      if (link.kind === 'anidb' && link.url) {
        const anidbMatch = link.url.match(/anidb\.net\/(?:anime\/|a)(\d+)/)
        if (anidbMatch) {
          ids.anidb = Number.parseInt(anidbMatch[1], 10)
        }
      }
      // World-Art
      if (link.kind === 'world_art' && link.url) {
        const worldArtMatch = link.url.match(/world-art\.ru\/animation\/animation\.php\?id=(\d+)/)
        if (worldArtMatch) {
          ids.worldArt = Number.parseInt(worldArtMatch[1], 10)
        }
      }
      // Кинопоиск
      if (link.kind === 'kinopoisk' && link.url) {
        const kinopoiskMatch = link.url.match(/kinopoisk\.ru\/(?:film|series)\/(\d+)/)
        if (kinopoiskMatch) {
          ids.kinopoisk = Number.parseInt(kinopoiskMatch[1], 10)
        }
      }
    }
  }

  return ids
}
