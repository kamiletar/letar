import { ipcMain, powerSaveBlocker } from 'electron'

let blockerId: number | null = null

/**
 * Не даёт экрану гаснуть во время воспроизведения (`prevent-display-sleep`) — снимается на
 * паузе/остановке рендерером (`VideoPlayer`, по `isPlaying`) и автоматически при выходе из
 * приложения вместе с процессом.
 */
export function registerPowerHandlers(): void {
  ipcMain.handle('power:setPreventSleep', (_event, enabled: boolean) => {
    if (enabled) {
      if (blockerId === null || !powerSaveBlocker.isStarted(blockerId)) {
        blockerId = powerSaveBlocker.start('prevent-display-sleep')
      }
    } else if (blockerId !== null && powerSaveBlocker.isStarted(blockerId)) {
      powerSaveBlocker.stop(blockerId)
      blockerId = null
    }
  })
}
