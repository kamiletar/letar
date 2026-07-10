/**
 * Общий интерфейс для торрент-сервисов (WebTorrent и qBittorrent).
 *
 * Определяет контракт, которому должны соответствовать оба бэкенда,
 * чтобы rutracker-download-orchestrator и IPC handlers могли работать
 * с любым из них без изменений.
 */

import type { EventEmitter } from 'events'

import type { AddTorrentOptions, TorrentInfo } from './types'

/** Статус импорта торрента */
export type TorrentImportStatus = 'none' | 'queued' | 'imported'

/** Мета-апдейт для updateMeta */
export interface TorrentMetaUpdate {
  shikimoriId?: number
  animeName?: string
  importStatus?: TorrentImportStatus
  rutrackerUrl?: string
  isBundle?: boolean
  bundleAnimesJson?: string
}

/**
 * Общий интерфейс торрент-сервиса.
 *
 * Расширяет EventEmitter для совместимости с .on/.off паттерном
 * (orchestrator подписывается на 'torrent:done').
 */
export interface TorrentServiceInterface extends EventEmitter {
  /** Инициализировать клиент (подключение, восстановление из БД, запуск polling) */
  init(): Promise<void>

  /** Остановить клиент (таймеры, сохранить состояние) */
  destroy(): Promise<void>

  /** Добавить торрент по магнет-ссылке */
  add(magnetURI: string, options: AddTorrentOptions): Promise<TorrentInfo>

  /** Приостановить торрент */
  pause(infoHash: string): boolean

  /** Возобновить торрент */
  resume(infoHash: string): boolean

  /** Перепроверить торрент (recheck) */
  recheck(infoHash: string): boolean

  /** Удалить торрент (с файлами или без) */
  remove(infoHash: string, deleteFiles?: boolean): Promise<boolean>

  /** Получить информацию об одном торренте */
  get(infoHash: string): TorrentInfo | null

  /** Получить все торренты */
  getAll(): TorrentInfo[]

  /** Обновить пользовательские мета-поля */
  updateMeta(infoHash: string, update: TorrentMetaUpdate): void

  /** Получить метаданные торрента (для оркестратора) */
  getShikimoriMeta(infoHash: string): {
    shikimoriId?: number
    animeName?: string
    rutrackerUrl?: string
    isBundle?: boolean
    bundleAnimesJson?: string
  } | null
}
