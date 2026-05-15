/**
 * Интерфейс адаптера сервера
 *
 * Абстрагирует разницу API между Desktop и Tracker серверами.
 * Все методы возвращают данные в едином формате shared типов.
 */

import type { AnimeDetails, AnimeListItem, LastWatched, SubtitleTrack, WatchProgress } from '@letar/animatrona-shared'

/** Данные для сохранения прогресса */
export interface ProgressSaveData {
  currentTime: number
  completed?: boolean
  duration?: number
}

/** Информация об эпизоде для получения URL видео */
export interface EpisodeVideoInfo {
  id?: string
  videoCid: string | null
  videoPath: string | null
}

/** Параметры запроса библиотеки */
export interface LibraryOptions {
  /** Поисковый запрос (серверный поиск для Tracker, игнорируется Desktop) */
  search?: string
}

/** Унифицированный интерфейс API сервера */
export interface ServerAdapter {
  /** Получить список аниме */
  getLibrary(options?: LibraryOptions): Promise<AnimeListItem[]>
  /** Получить детали аниме */
  getAnimeDetails(animeId: string): Promise<AnimeDetails>
  /** Получить URL постера */
  getPosterUrl(animeId: string): string
  /** Получить URL видео эпизода */
  getEpisodeVideoUrl(episode: EpisodeVideoInfo): string | null
  /** Получить URL аудио из CID */
  getAudioCidUrl(cid: string): string
  /** Получить прогресс просмотра */
  getProgress(episodeId: string): Promise<WatchProgress | null>
  /** Сохранить прогресс просмотра */
  saveProgress(episodeId: string, data: ProgressSaveData): Promise<unknown>
  /** Получить последний просмотренный */
  getLastWatched(): Promise<LastWatched | null>
  /** Получить статус сервера */
  checkStatus(): Promise<boolean>
  /** Получить URL IPFS контента */
  getIpfsUrl(cid: string): string
  /** Получить URL субтитров в VTT формате */
  getSubtitleVttUrl(track: SubtitleTrack): string | null
  /** Получить URL субтитров из CID */
  getSubtitleUrlFromCid(track: SubtitleTrack): string | null
  /** Получить URL медиафайла (Desktop: локальный путь) */
  getMediaUrl(videoPath: string): string
  /** Базовый fetch с авторизацией */
  fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T>
  /** Базовый URL API */
  getApiBase(): string
}
