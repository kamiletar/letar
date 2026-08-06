/**
 * Preload — Торрент-клиент
 *
 * API для управления скачиванием торрентов из renderer.
 */

import { ipcRenderer } from 'electron'
import type { AddTorrentOptions, TorrentInfo, TorrentProgress } from '../services/torrent/types'
import { on } from './ipc-helper'

/** Torrent API */
export const torrentPreload = {
  /** Инициализировать клиент */
  init: (): Promise<{ success: boolean; data?: boolean; error?: string }> => ipcRenderer.invoke('torrent:init'),

  /** Добавить торрент по магнет-ссылке */
  add: (
    magnetURI: string,
    options: AddTorrentOptions,
  ): Promise<{ success: boolean; data?: TorrentInfo; error?: string }> =>
    ipcRenderer.invoke('torrent:add', magnetURI, options),

  /** Приостановить торрент */
  pause: (infoHash: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('torrent:pause', infoHash),

  /** Возобновить торрент */
  resume: (infoHash: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('torrent:resume', infoHash),

  /** Удалить торрент */
  remove: (infoHash: string, deleteFiles?: boolean): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('torrent:remove', infoHash, deleteFiles),

  /** Информация об одном торренте */
  get: (infoHash: string): Promise<{ success: boolean; data?: TorrentInfo | null; error?: string }> =>
    ipcRenderer.invoke('torrent:get', infoHash),

  /** Список всех торрентов */
  getAll: (): Promise<{ success: boolean; data?: TorrentInfo[]; error?: string }> =>
    ipcRenderer.invoke('torrent:getAll'),

  /** Обновить метаданные торрента (importStatus, isBundle и т.д.) */
  updateMeta: (
    infoHash: string,
    update: { importStatus?: string; isBundle?: boolean; bundleAnimesJson?: string },
  ): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('torrent:updateMeta', infoHash, update),

  /** Пересчитать хеш торрента (полная верификация кусков) */
  recheck: (infoHash: string): Promise<{ success: boolean; data?: boolean; error?: string }> =>
    ipcRenderer.invoke('torrent:recheck', infoHash),

  /** Получить список файлов торрента */
  getFiles: (
    infoHash: string,
  ): Promise<{
    success: boolean
    data?: Array<{ index: number; name: string; size: number; progress: number }>
    error?: string
  }> => ipcRenderer.invoke('torrent:getFiles', infoHash),

  /** Остановить клиент */
  destroy: (): Promise<{ success: boolean; data?: boolean; error?: string }> => ipcRenderer.invoke('torrent:destroy'),

  /** Проверить подключение к qBittorrent (без сохранения настроек) */
  testQBittorrentConnection: (config: {
    url: string
    username: string
    password: string
  }): Promise<{
    success: boolean
    data?: { success: boolean; version?: string; error?: string }
    error?: string
  }> => ipcRenderer.invoke('qbittorrent:testConnection', config),

  /** Подписка на прогресс торрента (компактный формат, без files[]) */
  onProgress: on<[TorrentProgress]>('torrent:progress'),

  /** Подписка на добавление торрента */
  onAdded: on<[TorrentInfo]>('torrent:added'),

  /** Подписка на завершение скачивания */
  onDone: on<[TorrentInfo]>('torrent:done'),

  /** Подписка на ошибки */
  onError: on<[{ infoHash: string; error: string }]>('torrent:error'),

  /** Подписка на удаление торрента */
  onRemoved: on<[{ infoHash: string }]>('torrent:removed'),
}
