/**
 * Preload — Автообновления
 *
 * Проверка, скачивание и установка обновлений.
 */

import { ipcRenderer } from 'electron'
import { on } from './ipc-helper'

/** Автообновления */
export const updaterPreload = {
  /** Проверить наличие обновлений */
  check: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('updater:check'),

  /** Скачать обновление */
  download: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('updater:download'),

  /** Установить обновление и перезапустить */
  install: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('updater:install'),

  /** Получить текущий статус обновления */
  getStatus: async (): Promise<{
    status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
    updateInfo: { version: string; releaseDate: string; releaseNotes?: string } | null
    downloadProgress: number
    error: string | null
    downloadSpeed: number
    downloadEta: number
  }> => {
    const result = await ipcRenderer.invoke('updater:status')
    return result.success
      ? result.data
      : { status: 'idle', updateInfo: null, downloadProgress: 0, error: null, downloadSpeed: 0, downloadEta: 0 }
  },

  /** Получить версию приложения */
  getVersion: async (): Promise<string> => {
    const result = await ipcRenderer.invoke('updater:version')
    return result.success ? result.data : ''
  },

  /** Получить changelog из GitHub Releases */
  getChangelog: (version: string): Promise<{ success: boolean; changelog?: string | null; error?: string }> =>
    ipcRenderer.invoke('updater:getChangelog', version),

  /** Подписка на изменение статуса обновления */
  onStatusChange: on<
    [
      {
        status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
        updateInfo: { version: string; releaseDate: string; releaseNotes?: string } | null
        downloadProgress: number
        error: string | null
        downloadSpeed: number
        downloadEta: number
      },
    ]
  >('updater:status'),

  /** Подписка на получение changelog */
  onChangelog: on<[{ version: string; changelog: string }]>('updater:changelog'),
}
