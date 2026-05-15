/**
 * IPC handlers для диалогов файловой системы
 */

import { dialog } from 'electron'

import type { FileFilter } from '../../shared/types'
import { MKV_EXPORT_FILTERS, VIDEO_FILTERS } from '../constants/file-filters'
import { allowFilePath, allowPath } from '../protocols/allowed-paths'
import { createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC handlers для диалогов
 */
export function registerDialogHandlers(): void {
  // Выбор файла
  createHandler('dialog:selectFile', async (filters?: FileFilter[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters || VIDEO_FILTERS,
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    allowFilePath(filePath)
    return filePath
  })

  // Выбор нескольких файлов
  createHandler('dialog:selectFiles', async (filters?: FileFilter[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: filters || VIDEO_FILTERS,
    })

    if (result.canceled) {
      return []
    }

    for (const filePath of result.filePaths) {
      allowFilePath(filePath)
    }

    return result.filePaths
  })

  // Выбор папки
  createHandler('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const folderPath = result.filePaths[0]
    allowPath(folderPath)
    return folderPath
  })

  // Сохранение файла
  createHandler('dialog:saveFile', async (defaultName?: string, filters?: FileFilter[]) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: filters || MKV_EXPORT_FILTERS,
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    return result.filePath
  })
}
