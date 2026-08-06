/**
 * Preload — VMAF автоподбор качества
 *
 * Расчёт VMAF и поиск оптимального CQ.
 */

import { ipcRenderer } from 'electron'
import type { VideoTranscodeOptions } from '../../shared/types'
import type {
  CqSearchOptions,
  CqSearchProgress,
  CqSearchResult,
  SampleConfig,
  VmafOptions,
  VmafResult,
} from '../../shared/types/vmaf'
import { on } from './ipc-helper'

/** VMAF автоподбор качества */
export const vmafPreload = {
  /** Расчёт VMAF между двумя видео */
  calculate: (
    encoded: string,
    original: string,
    options?: VmafOptions,
  ): Promise<{ success: boolean; data?: VmafResult; error?: string }> =>
    ipcRenderer.invoke('vmaf:calculate', encoded, original, options),

  /** Пакетный расчёт VMAF для нескольких пар */
  calculateBatch: (
    pairs: Array<[string, string]>,
    options?: VmafOptions,
  ): Promise<{ success: boolean; data?: VmafResult[]; error?: string }> =>
    ipcRenderer.invoke('vmaf:calculateBatch', pairs, options),

  /**
   * Поиск оптимального CQ для целевого VMAF
   *
   * @param itemId Опциональный ID элемента очереди для сохранения прогресса в main process
   *               При передаче itemId прогресс сохраняется и переживает навигацию
   */
  findOptimalCQ: (
    inputPath: string,
    videoOptions: Omit<VideoTranscodeOptions, 'cq'>,
    options?: Partial<CqSearchOptions>,
    preferCpu?: boolean,
    itemId?: string,
  ): Promise<{ success: boolean; data?: CqSearchResult; error?: string }> =>
    ipcRenderer.invoke('vmaf:findOptimalCQ', inputPath, videoOptions, options, preferCpu ?? false, itemId),

  /** Извлечение сэмплов из видео */
  extractSamples: (
    inputPath: string,
    outputDir: string,
    config?: Partial<SampleConfig>,
  ): Promise<{ success: boolean; data?: string[]; error?: string }> =>
    ipcRenderer.invoke('vmaf:extractSamples', inputPath, outputDir, config),

  /** Очистка временных файлов сэмплов */
  cleanup: (sampleDir: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('vmaf:cleanup', sampleDir),

  /** Подписка на прогресс поиска CQ */
  onProgress: on<[CqSearchProgress]>('vmaf:progress'),
}
