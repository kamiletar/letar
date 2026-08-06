/**
 * IPC handlers для работы с субтитрами
 */

import { previewShift, shiftSubtitles, type ShiftSubtitlesOptions } from '../services/subtitle-shifter'
import { createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC handlers для субтитров
 */
export function registerSubtitleHandlers(): void {
  // Сдвиг таймкодов субтитров
  createHandler('subtitle:shift', (options: ShiftSubtitlesOptions) => shiftSubtitles(options))

  // Предпросмотр сдвига (первые N событий)
  createHandler(
    'subtitle:previewShift',
    (inputPath: string, offsetMs: number, limit = 5) => previewShift(inputPath, offsetMs, limit),
  )
}
