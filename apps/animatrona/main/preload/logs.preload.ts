/**
 * Logs preload — API для просмотра main.log в renderer.
 */

import { ipcRenderer } from 'electron'

export const logsPreload = {
  /** Получить tail последних N строк лога */
  tail: (lines = 200): Promise<{ content: string; filePath: string | null }> => ipcRenderer.invoke('logs:tail', lines),

  /** Старт live-watch — main будет broadcastить новые строки через 'logs:newLines' */
  startWatch: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('logs:startWatch'),

  /** Стоп live-watch */
  stopWatch: (): Promise<{ success: boolean }> => ipcRenderer.invoke('logs:stopWatch'),

  /** Подписка на новые строки лога (пока активен startWatch) */
  onNewLines: (callback: (lines: string[]) => void): (() => void) => {
    const handler = (_event: unknown, lines: unknown) => callback(lines as string[])
    ipcRenderer.on('logs:newLines', handler)
    return () => ipcRenderer.removeListener('logs:newLines', handler)
  },
}
