/**
 * Preload — Диалоги
 *
 * Системные диалоги выбора файлов и папок.
 */

import { ipcRenderer } from 'electron'
import type { FileFilter } from '../../shared/types'

/** Диалоги выбора файлов и папок */
export const dialogPreload = {
  /** Открыть диалог выбора файла */
  selectFile: async (filters?: FileFilter[]): Promise<string | null> => {
    const result = await ipcRenderer.invoke('dialog:selectFile', filters)
    return result.success ? result.data : null
  },

  /** Открыть диалог выбора нескольких файлов */
  selectFiles: async (filters?: FileFilter[]): Promise<string[]> => {
    const result = await ipcRenderer.invoke('dialog:selectFiles', filters)
    return result.success ? result.data : []
  },

  /** Открыть диалог выбора папки */
  selectFolder: async (): Promise<string | null> => {
    const result = await ipcRenderer.invoke('dialog:selectFolder')
    return result.success ? result.data : null
  },

  /** Открыть диалог сохранения файла */
  saveFile: async (defaultName?: string, filters?: FileFilter[]): Promise<string | null> => {
    const result = await ipcRenderer.invoke('dialog:saveFile', defaultName, filters)
    return result.success ? result.data : null
  },
}
