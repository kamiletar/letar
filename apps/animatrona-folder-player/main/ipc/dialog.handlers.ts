import { dialog, ipcMain } from 'electron'

import { type FileFilter, VIDEO_FILTERS } from '../constants/file-filters'
import { allowFilePath, allowPath } from '../protocols/allowed-paths'

export function registerDialogHandlers(): void {
  ipcMain.handle('dialog:selectFile', async (_event, filters?: FileFilter[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters ?? VIDEO_FILTERS,
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    allowFilePath(filePath)
    return filePath
  })

  ipcMain.handle('dialog:selectFolder', async () => {
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
}
