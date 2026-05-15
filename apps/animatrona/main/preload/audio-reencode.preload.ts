/**
 * Preload — Перекодировка аудиодорожек
 */

import { ipcRenderer } from 'electron'

import type {
  BatchReencodePreview,
  BatchReencodeProgress,
  BatchReencodeResult,
  ReencodePreview,
  ReencodeProgress,
  ReencodeResult,
} from '../../shared/types/audio-reencode'
import type { IpcResult } from '../utils/ipc-handler-factory'
import { on } from './ipc-helper'

export const audioReencodePreload = {
  /** Предпросмотр: список дорожек для перекодировки */
  preview: (animeId: string, targetBitrate: number): Promise<IpcResult<ReencodePreview>> =>
    ipcRenderer.invoke('audio:reencode-preview', animeId, targetBitrate),

  /** Запуск перекодировки */
  start: (animeId: string, targetBitrate: number): Promise<IpcResult<ReencodeResult>> =>
    ipcRenderer.invoke('audio:reencode', animeId, targetBitrate),

  /** Отмена перекодировки */
  cancel: (): Promise<IpcResult<void>> => ipcRenderer.invoke('audio:reencode-cancel'),

  /** Подписка на прогресс перекодировки */
  onProgress: on<[ReencodeProgress]>('audio:reencode-progress'),

  // === Пакетная перекодировка ===

  /** Предпросмотр пакетной перекодировки */
  batchPreview: (): Promise<IpcResult<BatchReencodePreview>> => ipcRenderer.invoke('audio:batch-reencode-preview'),

  /** Запуск пакетной перекодировки */
  batchStart: (): Promise<IpcResult<BatchReencodeResult>> => ipcRenderer.invoke('audio:batch-reencode'),

  /** Отмена пакетной перекодировки */
  batchCancel: (): Promise<IpcResult<void>> => ipcRenderer.invoke('audio:batch-reencode-cancel'),

  /** Подписка на прогресс пакетной перекодировки */
  onBatchProgress: on<[BatchReencodeProgress]>('audio:batch-reencode-progress'),
}
