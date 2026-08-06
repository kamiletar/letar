/**
 * IPC handlers для перекодировки аудиодорожек
 */

import { BrowserWindow } from 'electron'

import {
  batchReencodeAudio,
  previewBatchReencode,
  previewReencode,
  reencodeAnimeAudio,
} from '../services/audio-reencode-service'
import { createHandler, createHandlerWithEvent } from '../utils/ipc-handler-factory'

/** Токен отмены текущей перекодировки (одиночной) */
let activeCancelToken: { cancelled: boolean } | null = null

/** Токен отмены пакетной перекодировки */
let batchCancelToken: { cancelled: boolean } | null = null

/**
 * Регистрация IPC handlers для перекодировки аудио
 */
export function registerAudioReencodeHandlers(): void {
  // Предпросмотр: список дорожек для перекодировки
  createHandler(
    'audio:reencode-preview',
    async (animeId: string, targetBitrate: number) => previewReencode(animeId, targetBitrate),
  )

  // Запуск перекодировки с progress events
  createHandlerWithEvent('audio:reencode', async (event, animeId: string, targetBitrate: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    activeCancelToken = { cancelled: false }

    try {
      return await reencodeAnimeAudio(
        animeId,
        targetBitrate,
        (progress) => {
          win?.webContents.send('audio:reencode-progress', progress)
        },
        activeCancelToken,
      )
    } finally {
      activeCancelToken = null
    }
  })

  // Отмена перекодировки
  createHandler('audio:reencode-cancel', () => {
    if (activeCancelToken) {
      activeCancelToken.cancelled = true
    }
  })

  // === Пакетная перекодировка ===

  // Предпросмотр пакетной перекодировки
  createHandler('audio:batch-reencode-preview', async () => previewBatchReencode())

  // Запуск пакетной перекодировки с progress events
  createHandlerWithEvent('audio:batch-reencode', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    batchCancelToken = { cancelled: false }

    try {
      return await batchReencodeAudio((progress) => {
        win?.webContents.send('audio:batch-reencode-progress', progress)
      }, batchCancelToken)
    } finally {
      batchCancelToken = null
    }
  })

  // Отмена пакетной перекодировки
  createHandler('audio:batch-reencode-cancel', () => {
    if (batchCancelToken) {
      batchCancelToken.cancelled = true
    }
  })
}
