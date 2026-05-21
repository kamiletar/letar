/**
 * Preload — Tracker & Cloud Library
 *
 * IPC каналы для интеграции с animatrona-tracker.
 */

import { ipcRenderer } from 'electron'
import type {
  TrackerAnimeDetailResult,
  TrackerBatchItem,
  TrackerBatchProgress,
  TrackerBatchResult,
  TrackerCatalogResult,
  TrackerConfig,
  TrackerConnectionResult,
  TrackerLibraryItem,
  TrackerPublishResult,
  TrackerSyncResult,
  TrackerUserProfile,
} from '../../shared/types/tracker'
import { on } from './ipc-helper'

/** Tracker — публикация и конфигурация */
export const trackerPreload = {
  /** Получить конфигурацию */
  getConfig: (): Promise<TrackerConfig> => ipcRenderer.invoke('tracker:getConfig'),

  /** Обновить конфигурацию */
  updateConfig: (updates: Partial<TrackerConfig>): Promise<TrackerConfig> =>
    ipcRenderer.invoke('tracker:updateConfig', updates),

  /** Проверить подключение */
  testConnection: (): Promise<TrackerConnectionResult> => ipcRenderer.invoke('tracker:testConnection'),

  /** Опубликовать аниме на tracker */
  publish: (directoryCid: string): Promise<TrackerPublishResult> => ipcRenderer.invoke('tracker:publish', directoryCid),

  /** Пакетная публикация */
  batchPublish: (items: TrackerBatchItem[]): Promise<TrackerBatchResult> =>
    ipcRenderer.invoke('tracker:batchPublish', items),

  /** Отменить пакетную публикацию */
  cancelBatch: (): Promise<void> => ipcRenderer.invoke('tracker:cancelBatch'),

  /** Подписка на прогресс пакетной публикации */
  onBatchProgress: on<[TrackerBatchProgress]>('tracker:batchProgress'),

  /** Получить список раздач */
  getDistributions: () => ipcRenderer.invoke('tracker:getDistributions'),

  // ============================================================================
  // Cloud Library
  // ============================================================================

  /** Получить каталог аниме с трекера */
  getCatalog: (params?: { page?: number; limit?: number; q?: string }): Promise<TrackerCatalogResult> =>
    ipcRenderer.invoke('tracker:getCatalog', params),

  /** Получить детали аниме с трекера */
  getAnimeDetail: (animeId: string): Promise<TrackerAnimeDetailResult> =>
    ipcRenderer.invoke('tracker:getAnimeDetail', animeId),

  /** Синхронизировать библиотеку с трекером */
  syncLibrary: (): Promise<TrackerSyncResult> => ipcRenderer.invoke('tracker:syncLibrary'),

  /** Получить библиотеку с трекера (для восстановления) */
  getLibrary: (): Promise<{ success: boolean; data?: TrackerLibraryItem[]; error?: string }> =>
    ipcRenderer.invoke('tracker:getLibrary'),

  /** Добавить аниме из трекера в библиотеку */
  addToLibrary: (animeId: string) => ipcRenderer.invoke('tracker:addToLibrary', animeId),

  /** Открепить контент аниме (освобождение места) */
  unpinAnime: (animeId: string) => ipcRenderer.invoke('library:unpinAnime', animeId),

  /** Закрепить контент аниме (скачать с пиров на диск) */
  repinAnime: (animeId: string) => ipcRenderer.invoke('library:repinAnime', animeId),

  /** Пакетное изменение статуса просмотра */
  batchUpdateWatchStatus: (input: { animeIds: string[]; watchStatus: string }) =>
    ipcRenderer.invoke('library:batchUpdateWatchStatus', input),

  /** Пакетный аспин аниме */
  batchUnpinAnime: (animeIds: string[]) => ipcRenderer.invoke('library:batchUnpinAnime', animeIds),

  /** Прогресс пакетного аспина: current, total, animeName */
  onBatchUnpinProgress: on<[{ current: number; total: number; animeName: string }]>('library:batchUnpinProgress'),

  // ============================================================================
  // Watch Progress Sync
  // ============================================================================

  /** Отправить прогресс просмотра на трекер (fire-and-forget) */
  pushWatchProgress: (params: {
    trackerAnimeId: string
    episodeNumber: number
    currentTime: number
    duration: number
    completed?: boolean
  }): Promise<void> => ipcRenderer.invoke('tracker:pushWatchProgress', params),

  // ============================================================================
  // Background Sync
  // ============================================================================

  /** Немедленно запушить watchStatus одного аниме на трекер */
  pushLibraryItem: (animeId: string): Promise<void> => ipcRenderer.invoke('tracker:pushLibraryItem', animeId),

  /** Запустить фоновую синхронизацию */
  startSync: (): Promise<void> => ipcRenderer.invoke('tracker:startSync'),

  /** Остановить фоновую синхронизацию */
  stopSync: (): Promise<void> => ipcRenderer.invoke('tracker:stopSync'),

  /** Подписка на завершение синхронизации */
  onSyncCompleted: on<[{ synced: number; serverItems: number }]>('tracker:syncCompleted'),

  /** Подписка на обновление профиля с трекера */
  onProfileUpdated: on<[TrackerUserProfile]>('tracker:profileUpdated'),
}
