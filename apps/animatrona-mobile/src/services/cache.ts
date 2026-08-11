/**
 * Кэш метаданных библиотеки в AsyncStorage
 *
 * Хранит JSON данные библиотеки и деталей аниме для оффлайн доступа.
 * Обновляется при каждом успешном запросе к серверу.
 *
 * Ключи включают serverId для изоляции данных между серверами.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import type { AnimeDetails, AnimeListItem, LastWatched } from '@letar/animatrona-shared'

// --- Ключи (с serverId префиксом) ---

const KEYS = {
  library: (sid: string) => `@animatrona/cache/${sid}/library`,
  libraryUpdatedAt: (sid: string) => `@animatrona/cache/${sid}/library_updated_at`,
  anime: (sid: string, id: string) => `@animatrona/cache/${sid}/anime/${id}`,
  lastWatched: (sid: string) => `@animatrona/cache/${sid}/last_watched`,
  /** Маппинг animeId → локальный путь постера */
  posterMap: '@animatrona/cache/poster_map',
} as const

// --- Библиотека ---

/** Получить кэшированный список аниме */
export async function getCachedLibrary(serverId: string): Promise<AnimeListItem[] | null> {
  try {
    const json = await AsyncStorage.getItem(KEYS.library(serverId))
    if (!json) { return null }
    return JSON.parse(json) as AnimeListItem[]
  } catch (error) {
    console.warn('[cache] Ошибка чтения кэша библиотеки:', error)
    return null
  }
}

/** Сохранить список аниме в кэш */
export async function setCachedLibrary(serverId: string, library: AnimeListItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.library(serverId), JSON.stringify(library))
    await AsyncStorage.setItem(KEYS.libraryUpdatedAt(serverId), Date.now().toString())
  } catch (error) {
    console.warn('[cache] Ошибка записи кэша библиотеки:', error)
  }
}

/** Время последнего обновления кэша библиотеки */
export async function getLibraryCacheAge(serverId: string): Promise<number | null> {
  try {
    const ts = await AsyncStorage.getItem(KEYS.libraryUpdatedAt(serverId))
    return ts ? Number(ts) : null
  } catch {
    return null
  }
}

// --- Детали аниме ---

/** Получить кэшированные детали аниме */
export async function getCachedAnimeDetails(serverId: string, animeId: string): Promise<AnimeDetails | null> {
  try {
    const json = await AsyncStorage.getItem(KEYS.anime(serverId, animeId))
    if (!json) { return null }
    return JSON.parse(json) as AnimeDetails
  } catch (error) {
    console.warn('[cache] Ошибка чтения кэша аниме:', animeId, error)
    return null
  }
}

/** Сохранить детали аниме в кэш */
export async function setCachedAnimeDetails(serverId: string, animeId: string, details: AnimeDetails): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.anime(serverId, animeId), JSON.stringify(details))
  } catch (error) {
    console.warn('[cache] Ошибка записи кэша аниме:', animeId, error)
  }
}

// --- Последний просмотренный ---

/** Получить кэшированный последний просмотренный */
export async function getCachedLastWatched(serverId: string): Promise<LastWatched | null> {
  try {
    const json = await AsyncStorage.getItem(KEYS.lastWatched(serverId))
    if (!json) { return null }
    return JSON.parse(json) as LastWatched
  } catch {
    return null
  }
}

/** Сохранить последний просмотренный в кэш */
export async function setCachedLastWatched(serverId: string, data: LastWatched): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.lastWatched(serverId), JSON.stringify(data))
  } catch {
    // Некритичная ошибка
  }
}

// --- Постеры (глобальные, не per-server) ---

/** Маппинг animeId → локальный путь к постеру */
export type PosterMap = Record<string, string>

/** Получить маппинг постеров */
export async function getPosterMap(): Promise<PosterMap> {
  try {
    const json = await AsyncStorage.getItem(KEYS.posterMap)
    if (!json) { return {} }
    return JSON.parse(json) as PosterMap
  } catch {
    return {}
  }
}

/** Обновить маппинг постеров */
export async function setPosterMap(map: PosterMap): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.posterMap, JSON.stringify(map))
  } catch {
    // Некритичная ошибка
  }
}

/** Добавить постер в маппинг */
export async function addPosterToMap(animeId: string, localPath: string): Promise<void> {
  const map = await getPosterMap()
  map[animeId] = localPath
  await setPosterMap(map)
}

/** Удалить постер из маппинга */
export async function removePosterFromMap(animeId: string): Promise<void> {
  const map = await getPosterMap()
  delete map[animeId]
  await setPosterMap(map)
}

// --- Очистка ---

/** Очистить весь кэш метаданных */
export async function clearMetadataCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys()
    const cacheKeys = allKeys.filter((key) => key.startsWith('@animatrona/cache/'))
    if (cacheKeys.length > 0) {
      await AsyncStorage.removeMany(cacheKeys)
    }
  } catch (error) {
    console.warn('[cache] Ошибка очистки кэша:', error)
  }
}
