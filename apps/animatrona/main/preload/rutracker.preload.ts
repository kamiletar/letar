/**
 * Preload — Импорт из Рутрекера
 *
 * Парсинг раздач, матчинг с Shikimori, подтверждение, скачивание.
 */

import { ipcRenderer } from 'electron'
import type { StartDownloadParams, StartDownloadResult } from '../services/rutracker/rutracker-download-orchestrator'
import type { RutrackerImportResult } from '../services/rutracker/rutracker-import'
import type { RutrackerTorrentInfo } from '../services/rutracker/types'
import type { ShikimoriAnimeExtended } from '../services/shikimori'
import { on } from './ipc-helper'

/** Rutracker Import API */
export const rutrackerPreload = {
  /** Загружает HTML страницы раздачи по URL */
  fetchPage: (
    url: string,
  ): Promise<{
    success: boolean
    data?: string
    error?: string
  }> => ipcRenderer.invoke('rutracker:fetchPage', url),

  /** Парсит HTML страницы раздачи */
  parse: (
    html: string,
    url: string,
  ): Promise<{
    success: boolean
    data?: RutrackerTorrentInfo
    error?: string
  }> => ipcRenderer.invoke('rutracker:parse', html, url),

  /** Полный пайплайн: парсинг + матчинг с Shikimori */
  import: (
    html: string,
    url: string,
  ): Promise<{
    success: boolean
    data?: RutrackerImportResult
    error?: string
  }> => ipcRenderer.invoke('rutracker:import', html, url),

  /** Подтвердить выбранное аниме на Shikimori */
  confirmMatch: (
    shikimoriId: number,
  ): Promise<{
    success: boolean
    data?: ShikimoriAnimeExtended
    error?: string
  }> => ipcRenderer.invoke('rutracker:confirmMatch', shikimoriId),

  /** Запустить скачивание торрента → автоматический импорт по завершении */
  startDownload: (
    params: StartDownloadParams,
  ): Promise<{
    success: boolean
    data?: StartDownloadResult
    error?: string
  }> => ipcRenderer.invoke('rutracker:startDownload', params),

  /** Метаданные загрузки для кнопки «В очередь» */
  getDownloadMeta: (
    infoHash: string,
  ): Promise<{
    success: boolean
    data?: { shikimoriId: number; animeName: string; folderPath: string } | null
    error?: string
  }> => ipcRenderer.invoke('rutracker:getDownloadMeta', infoHash),

  /** Список активных загрузок */
  getActiveDownloads: (): Promise<{
    success: boolean
    data?: Array<{ infoHash: string; name: string }>
    error?: string
  }> => ipcRenderer.invoke('rutracker:getActiveDownloads'),

  /** Отменить загрузку */
  cancelDownload: (
    infoHash: string,
    deleteFiles?: boolean,
  ): Promise<{
    success: boolean
    data?: boolean
    error?: string
  }> => ipcRenderer.invoke('rutracker:cancelDownload', infoHash, deleteFiles),

  /** Подписка на этапы импорта (живой прогресс) */
  onImportStep: on<[string]>('rutracker:importStep'),
}
