/**
 * IPC handlers для VMAF операций
 */

import { BrowserWindow } from 'electron'
import type { VideoTranscodeOptions } from '../../shared/types'
import type { CqSearchOptions, SampleConfig, VmafOptions } from '../../shared/types/vmaf'
import { ParallelTranscodeManager } from '../services/parallel-transcode-manager'
import { calculateVMAF, calculateVMAFBatch, cleanupSamples, extractSamples, findOptimalCQ } from '../src/ffmpeg'
import { createHandler, createHandlerWithEvent } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC handlers для VMAF
 */
export function registerVmafHandlers(): void {
  // Расчёт VMAF между двумя видео
  createHandler('vmaf:calculate', (encoded: string, original: string, options?: VmafOptions) =>
    calculateVMAF(encoded, original, options)
  )

  // Пакетный расчёт VMAF
  createHandler('vmaf:calculateBatch', (pairs: Array<[string, string]>, options?: VmafOptions) =>
    calculateVMAFBatch(pairs, options)
  )

  // Извлечение сэмплов из видео
  createHandler('vmaf:extractSamples', (inputPath: string, outputDir: string, config?: Partial<SampleConfig>) =>
    extractSamples(inputPath, outputDir, config)
  )

  // Очистка временных файлов
  createHandler('vmaf:cleanup', (sampleDir: string) => cleanupSamples(sampleDir))

  // Поиск оптимального CQ (с прогрессом)
  createHandlerWithEvent(
    'vmaf:findOptimalCQ',
    async (
      event,
      inputPath: string,
      videoOptions: Omit<VideoTranscodeOptions, 'cq'>,
      options?: Partial<CqSearchOptions>,
      preferCpu = false,
      itemId?: string
    ) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const manager = ParallelTranscodeManager.getInstance()

      const result = await findOptimalCQ(
        inputPath,
        videoOptions,
        options,
        (progress) => {
          // Сохраняем прогресс в manager для восстановления при навигации
          if (itemId) {
            manager.setVmafProgress(itemId, progress)
          }
          // Отправляем прогресс в renderer
          win?.webContents.send('vmaf:progress', progress)
        },
        preferCpu
      )

      // Очищаем прогресс после завершения
      if (itemId) {
        manager.clearVmafProgress(itemId)
      }

      return result
    }
  )
}
