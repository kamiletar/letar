/**
 * IPC handlers для управления очередью транскодирования
 *
 * Каналы:
 * - transcode:addToQueue — добавить файл в очередь
 * - transcode:removeFromQueue — удалить из очереди
 * - transcode:start — начать обработку очереди
 * - transcode:pauseItem — приостановить элемент
 * - transcode:resumeItem — возобновить элемент
 * - transcode:cancelItem — отменить элемент
 * - transcode:reorderQueue — изменить порядок
 * - transcode:updateSettings — обновить настройки элемента
 * - transcode:getQueue — получить текущую очередь
 * - transcode:getPauseCapabilities — проверить возможность паузы
 *
 * События (отправляются в renderer):
 * - transcode:progress — прогресс элемента
 * - transcode:statusChange — изменение статуса
 * - transcode:queueChange — изменение очереди
 */

import type { DemuxResult, PerFileTranscodeSettings, TranscodeProgressExtended } from '../../shared/types'
import { transcodeManager } from '../services/transcode-manager'
import { broadcastToWindows, createHandler, createThrottledBroadcaster } from '../utils/ipc-handler-factory'

/** Throttled broadcaster для progress событий (буферизация 100мс) */
const throttledProgressBroadcast = createThrottledBroadcaster<TranscodeProgressExtended>('transcode:progress', 100)

/**
 * Регистрирует IPC handlers для очереди транскодирования
 */
export function registerTranscodeQueueHandlers(): void {
  // Подписываемся на события менеджера и транслируем их в renderer
  transcodeManager.on('progress', (id, progress) => throttledProgressBroadcast(id, progress))
  transcodeManager.on('statusChange', (id, status, error) =>
    broadcastToWindows('transcode:statusChange', id, status, error)
  )
  transcodeManager.on('queueChange', (queue) => broadcastToWindows('transcode:queueChange', queue))
  transcodeManager.on('processingStarted', () => broadcastToWindows('transcode:processingStarted'))
  transcodeManager.on('processingCompleted', () => broadcastToWindows('transcode:processingCompleted'))

  // === Handlers ===

  // Добавить файл в очередь
  createHandler('transcode:addToQueue', (filePath: string, settings?: PerFileTranscodeSettings) =>
    transcodeManager.addToQueue(filePath, settings)
  )

  // Удалить из очереди
  createHandler('transcode:removeFromQueue', (id: string) => transcodeManager.removeFromQueue(id))

  // Начать обработку очереди
  createHandler('transcode:start', () => {
    transcodeManager.startProcessing()
  })

  // Приостановить элемент
  createHandler('transcode:pauseItem', (id: string) => transcodeManager.pauseItem(id))

  // Возобновить элемент
  createHandler('transcode:resumeItem', (id: string) => transcodeManager.resumeItem(id))

  // Отменить элемент
  createHandler('transcode:cancelItem', (id: string) => transcodeManager.cancelItem(id))

  // Изменить порядок очереди
  createHandler('transcode:reorderQueue', (orderedIds: string[]) => transcodeManager.reorderQueue(orderedIds))

  // Обновить настройки элемента
  createHandler('transcode:updateSettings', (id: string, settings: PerFileTranscodeSettings) =>
    transcodeManager.updateSettings(id, settings)
  )

  // Получить текущую очередь
  createHandler('transcode:getQueue', () => transcodeManager.getQueue())

  // Получить элемент по ID
  createHandler('transcode:getItem', (id: string) => transcodeManager.getItem(id))

  // Анализировать элемент
  createHandler('transcode:analyzeItem', (id: string, demuxResult: DemuxResult) =>
    transcodeManager.analyzeItem(id, demuxResult)
  )

  // Проверить возможность паузы
  createHandler('transcode:getPauseCapabilities', () => transcodeManager.getPauseCapabilities())

  // Приостановить всю обработку
  createHandler('transcode:pauseAll', () => transcodeManager.pauseAll())

  // Возобновить всю обработку
  createHandler('transcode:resumeAll', () => transcodeManager.resumeAll())

  // Установить путь к библиотеке
  createHandler('transcode:setLibraryPath', (libraryPath: string) =>
    transcodeManager.setDefaultLibraryPath(libraryPath)
  )
}
