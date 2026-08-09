/**
 * Запуск и ожидание батча параллельного транскодирования (видео + аудио) через
 * ParallelTranscodeManager, с отслеживанием прогресса и зависаний (stalled timeout).
 *
 * Выделено из ImportService.runParallelTranscode — раньше опиралось на `this`
 * (emitProgress/videoEncodingMeta/currentItemId), теперь принимает контекст явно.
 */

import type { BatchImportItem } from '../../../shared/types/parallel-transcode'
import { createModuleLogger } from '../../utils/logger'
import { ParallelTranscodeManager } from '../parallel-transcode-manager'
import type { VideoEncodingMeta } from './types'

const log = createModuleLogger('ImportService')

export interface TranscodeRunnerContext {
  emitProgress: (progress: number, fileName?: string, stage?: string) => void
  videoEncodingMeta: Map<string, VideoEncodingMeta>
  currentItemId: string | null
}

export async function runParallelTranscode(
  batchItems: BatchImportItem[],
  videoMaxConcurrent: number,
  audioMaxConcurrent: number,
  ctx: TranscodeRunnerContext,
): Promise<Set<string>> {
  const ptm = ParallelTranscodeManager.getInstance()
  const completedIds = new Set<string>()
  const totalItems = batchItems.length
  const expectedItemIds = new Set(batchItems.map((item) => item.id))

  log.info(`runParallelTranscode: ожидаем ${totalItems} items`, {
    expectedIds: [...expectedItemIds],
  })

  const failedItemIds = new Set<string>()

  const completionPromise = new Promise<void>((resolve, reject) => {
    let stalledTimer: ReturnType<typeof setTimeout> | null = null
    // 30 мин без ЛЮБОЙ активности (progress/completion) = зависание
    // BDRip с VMAF CQ 40 может кодировать одну серию > 10 минут
    const STALLED_TIMEOUT = 30 * 60 * 1000
    // Периодический лог каждые 60с для диагностики
    let diagnosticTimer: ReturnType<typeof setInterval> | null = null
    // Трекаем последний процент прогресса для определения реальной активности
    let lastProgressPercent = -1

    const resetStalledTimer = () => {
      if (stalledTimer) {
        clearTimeout(stalledTimer)
      }
      stalledTimer = setTimeout(() => {
        const pendingIds = [...expectedItemIds].filter((id) => !completedIds.has(id))
        log.error(`STALLED: ${completedIds.size}/${totalItems} completed, pending: ${pendingIds.join(', ')}`)
        // Не блокируем — продолжаем с тем что есть
        cleanup()
        resolve()
      }, STALLED_TIMEOUT)
    }

    const startDiagnostic = () => {
      diagnosticTimer = setInterval(() => {
        const pendingIds = [...expectedItemIds].filter((id) => !completedIds.has(id))
        log.info(`Transcode progress: ${completedIds.size}/${totalItems}, pending: ${pendingIds.length}`, {
          pendingIds: pendingIds.slice(0, 5),
        })
      }, 60_000)
    }

    resetStalledTimer()
    startDiagnostic()

    // Слушаем события напрямую от ParallelTranscodeManager (без IPC)
    // Сбрасываем stalled timer при ЛЮБОМ изменении прогресса — иначе
    // при кодировании длинных серий (>10 мин) timer срабатывает раньше
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onProgress = (progress: any) => {
      const vDone = progress?.videoTasks?.completed ?? 0
      const vTotal = progress?.videoTasks?.total ?? totalItems
      const aDone = progress?.audioTasks?.completed ?? 0
      const aTotal = progress?.audioTasks?.total ?? 0
      const pct = progress?.totalPercent ?? 0

      // Сбрасываем stalled timer если прогресс реально изменился
      const roundedPct = Math.round(pct * 10)
      if (roundedPct !== lastProgressPercent) {
        lastProgressPercent = roundedPct
        resetStalledTimer()
      }

      // Маппим PTM 0-100% в диапазон 15-90%
      const mappedPercent = 15 + Math.round(pct * 0.75)
      ctx.emitProgress(mappedPercent, `Энкод: ${vDone}/${vTotal} видео, ${aDone}/${aTotal} аудио`, 'transcoding')
    }

    const onVideoCompleted = (
      _itemId: string,
      episodeId: string,
      _outputPath: string,
      meta: { ffmpegCommand?: string; transcodeDurationMs?: number; activeGpuWorkers?: number },
    ) => {
      ctx.videoEncodingMeta.set(episodeId, meta)
    }

    const onItemCompleted = (itemId: string, _episodeId: string, success: boolean, errorMessage?: string) => {
      if (!expectedItemIds.has(itemId)) {
        return
      }

      completedIds.add(itemId)
      log.info(`Item completed: ${itemId}, ${completedIds.size}/${totalItems}, success=${success}`)

      if (!success) {
        failedItemIds.add(itemId)
        log.error(`Ошибка транскодирования item ${itemId}: ${errorMessage ?? 'unknown'}`)
      }

      if (completedIds.size >= totalItems) {
        cleanup()
        resolve()
      } else {
        // Сбрасываем stalled timer только на completion
        resetStalledTimer()
      }
    }

    const onBatchError = (error: string) => {
      cleanup()
      reject(new Error(`Batch error: ${error}`))
    }

    const onAllCancelled = () => {
      cleanup()
      reject(new Error('Импорт отменён пользователем'))
    }

    const cleanup = () => {
      if (stalledTimer) {
        clearTimeout(stalledTimer)
      }
      if (diagnosticTimer) {
        clearInterval(diagnosticTimer)
      }
      ptm.removeListener('aggregatedProgress', onProgress)
      ptm.removeListener('videoCompleted', onVideoCompleted)
      ptm.removeListener('itemCompleted', onItemCompleted)
      ptm.removeListener('batchError', onBatchError)
      ptm.removeListener('allCancelled', onAllCancelled)
    }

    ptm.on('aggregatedProgress', onProgress)
    ptm.on('videoCompleted', onVideoCompleted)
    ptm.on('itemCompleted', onItemCompleted)
    ptm.on('batchError', onBatchError)
    ptm.on('allCancelled', onAllCancelled)
  })

  // Запуск — ВАЖНО: startNewBatch вызывает reset(), который сбрасывает processingItemId.
  // Поэтому setProcessingItem ДОЛЖЕН быть ПОСЛЕ startNewBatch.
  ptm.startNewBatch(batchItems, undefined, { videoMaxConcurrent, audioMaxConcurrent })

  // Устанавливаем processingItemId ПОСЛЕ startNewBatch (reset() уже отработал)
  // updateImportQueueProgressFromMain проверяет его для маршрутизации прогресса в UI
  if (ctx.currentItemId) {
    const setResult = ptm.setProcessingItem(ctx.currentItemId)
    log.info('setProcessingItem', {
      itemId: ctx.currentItemId,
      success: setResult,
      currentProcessingId: ptm.getProcessingItemId(),
    })
  }

  await completionPromise

  // Сбрасываем processingItemId после завершения
  ptm.setProcessingItem(null)

  return failedItemIds
}
