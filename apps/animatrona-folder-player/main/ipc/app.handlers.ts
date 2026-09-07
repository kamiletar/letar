import { app, ipcMain, shell } from 'electron'

export interface OpenInSystemPlayerResult {
  success: boolean
  error?: string
}

export function registerAppHandlers(): void {
  ipcMain.handle('app:getVersion', () => app.getVersion())

  // Фоллбэк для кодеков, которые Chromium не декодирует (Hi10P, AC3/DTS/TrueHD) — открывает файл
  // в системном плеере по умолчанию (например MPC-HC с K-Lite), см. codec-support.ts
  ipcMain.handle('app:openInSystemPlayer', async (_event, filePath: string): Promise<OpenInSystemPlayerResult> => {
    const error = await shell.openPath(filePath)
    return error ? { success: false, error } : { success: true }
  })
}
