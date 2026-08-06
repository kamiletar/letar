/**
 * Preload — Разное
 *
 * Legacy события, автоопределение OP/ED, мобильный сервер.
 */

import { ipcRenderer } from 'electron'
import type { TranscodeProgress } from '../../shared/types'
import type { MobileServerStatus } from '../services/mobile-server'
import { on } from './ipc-helper'

/** События (legacy) */
export const legacyOnPreload = {
  /** Подписка на прогресс транскодирования (legacy) */
  transcodeProgress: on<[TranscodeProgress & { type: string }]>('ffmpeg:progress'),
}

/** Автоопределение OP/ED */
export const introDetectorPreload = {
  /** Определить OP/ED для списка эпизодов (минимум 2) */
  detect: async (
    episodes: Array<{ id: string; sourcePath: string; duration: number }>,
  ): Promise<
    Array<{
      episodeId: string
      introStartMs: number | null
      introEndMs: number | null
      outroStartMs: number | null
      outroEndMs: number | null
    }>
  > => {
    const result = await ipcRenderer.invoke('introDetector:detect', episodes)
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.data
  },
  /** Определить OP/ED из IPFS (скачивает аудиодорожки во temp файлы) */
  detectFromIpfs: async (
    episodes: Array<{ id: string; audioCid: string; duration: number }>,
  ): Promise<
    Array<{
      episodeId: string
      introStartMs: number | null
      introEndMs: number | null
      outroStartMs: number | null
      outroEndMs: number | null
    }>
  > => {
    const result = await ipcRenderer.invoke('introDetector:detectFromIpfs', episodes)
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.data
  },
  /** Подписка на прогресс определения */
  onProgress: on<[number, string]>('introDetector:progress'),
}

/** Mobile Server (доступ к библиотеке с телефона) */
export const mobileServerPreload = {
  /** Запустить мобильный сервер */
  start: async (port?: number): Promise<MobileServerStatus> => {
    const result = await ipcRenderer.invoke('mobile-server:start', port)
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.data
  },

  /** Остановить мобильный сервер */
  stop: async (): Promise<void> => {
    const result = await ipcRenderer.invoke('mobile-server:stop')
    if (!result.success) {
      throw new Error(result.error)
    }
  },

  /** Получить статус сервера */
  getStatus: async (): Promise<MobileServerStatus> => {
    const result = await ipcRenderer.invoke('mobile-server:status')
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.data
  },

  /** Получить QR-код для подключения (base64 PNG) */
  getQRCode: async (): Promise<string | null> => {
    const result = await ipcRenderer.invoke('mobile-server:getQRCode')
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.data
  },

  /** Обновить локальный IP (при смене сети) */
  refreshIp: async (): Promise<MobileServerStatus> => {
    const result = await ipcRenderer.invoke('mobile-server:refreshIp')
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.data
  },

  /** Подписка на сохранение прогресса с мобильного устройства */
  onProgressSaved: on<[{ animeId: string; episodeId: string }]>('mobile:progress-saved'),
}
