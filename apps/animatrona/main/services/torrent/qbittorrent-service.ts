/**
 * QBittorrentService — управление торрентами через qBittorrent Web API v2
 *
 * Singleton с polling-loop через /sync/maindata (дельты каждые 2 сек).
 * Метаданные торрентов (animeName, shikimoriId, rutrackerUrl, importStatus)
 * хранятся в SQLite (Prisma TorrentDownload), как и в старом TorrentService.
 *
 * Архитектура:
 * - qBittorrent работает как отдельный процесс — качает на диск без RAM буфера
 * - Polling loop собирает дельты состояния и эмитит события для IPC/orchestrator
 * - При изменении torrent.progress === 1 или file.progress === 1 → 'torrent:done' / 'file:complete'
 *
 * Публичный API идентичен TorrentService для совместимости с orchestrator и IPC handlers.
 */

import { EventEmitter } from 'events'

import { prisma } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'
import { addBytes } from '../ipfs/unified-ipfs-service'
import { QBittorrentClient, QBittorrentRequestError } from './qbittorrent-client'
import type { QBittorrentConfig, QBTorrentInfo, QBTorrentState } from './qbittorrent-types'
import type { AddTorrentOptions, TorrentInfo, TorrentStatus } from './types'

const log = createModuleLogger('QBittorrent')

/** Интервал polling (мс) — 2 секунды через /sync/maindata */
const POLL_INTERVAL = 2000

/** Debounce для persistToDb (мс) */
const DB_PERSIST_DEBOUNCE = 5000

/** Ratio по умолчанию для авто-остановки сидирования */
const DEFAULT_TARGET_RATIO = 2.0

/**
 * Категория qBittorrent для торрентов, добавленных через Animatrona.
 *
 * Позволяет отличить их от торрентов, добавленных пользователем напрямую в qBittorrent
 * (или другим приложением) — такие показываются в UI отдельной вкладкой «Остальное»,
 * а не смешиваются со списком, которым управляет Animatrona.
 */
export const ANIMATRONA_TORRENT_CATEGORY = 'animatrona'

/** Статус импорта торрента */
export type TorrentImportStatus = 'none' | 'queued' | 'imported'

/** Кэшированные метаданные (пользовательские поля, не приходят из qBittorrent) */
interface TorrentMeta {
  addedAt: number
  targetRatio: number
  downloadPath: string
  magnetURI: string
  shikimoriId?: number
  animeName?: string
  rutrackerUrl?: string
  isBundle?: boolean
  bundleAnimesJson?: string
  importStatus?: TorrentImportStatus
  error?: string
  /** CID сырых байт .torrent файла в IPFS (заполняется после получения метаданных) */
  torrentFileCid?: string
}

/** Событие завершения файла (для orchestrator → ImportQueue) */
export interface FileCompleteEvent {
  /** infoHash торрента */
  hash: string
  /** Индекс файла */
  fileIndex: number
  /** Имя файла (относительный путь от save_path) */
  fileName: string
  /** Полный путь к файлу на диске */
  filePath: string
  /** Размер файла в байтах */
  fileSize: number
}

/** Сервис управления торрентами через qBittorrent */
export class QBittorrentService extends EventEmitter {
  private static instance: QBittorrentService | null = null

  private client: QBittorrentClient | null = null
  /** Мета из БД (shikimoriId, animeName и т.д.) — НЕ приходит из qBittorrent */
  private meta: Map<string, TorrentMeta> = new Map()
  /** Последний известный снимок состояний — для определения изменений и эмита событий */
  private lastSnapshot: Map<string, QBTorrentInfo> = new Map()
  /** Трекер завершённых файлов для избежания дублей events */
  private completedFiles: Set<string> = new Set()
  /** Торренты, для которых уже был эмит torrent:done */
  private completedTorrents: Set<string> = new Set()
  /** Торренты, для которых уже была попытка экспорта .torrent файла (успешная или нет) */
  private exportedTorrentFile: Set<string> = new Set()

  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastRid = 0
  private initialized = false
  /** Debounce таймеры для persistToDb */
  private persistTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  private constructor() {
    super()
  }

  /** Получить singleton */
  static getInstance(): QBittorrentService {
    if (!QBittorrentService.instance) {
      QBittorrentService.instance = new QBittorrentService()
    }
    return QBittorrentService.instance
  }

  // ========================
  // Жизненный цикл
  // ========================

  /**
   * Инициализировать клиент qBittorrent.
   *
   * Загружает конфиг из Settings, подключается, восстанавливает мета из БД,
   * запускает polling-loop.
   */
  async init(config?: QBittorrentConfig): Promise<void> {
    if (this.initialized) {
      log.debug('init() вызван повторно, пропускаем')
      return
    }

    // Если конфиг не передан — загружаем из Settings
    const effectiveConfig = config ?? (await this.loadConfigFromSettings())
    if (!effectiveConfig) {
      throw new Error('qBittorrent не настроен (Settings → Torrent)')
    }

    this.client = new QBittorrentClient()
    await this.client.login(effectiveConfig)
    const version = await this.client.getVersion()
    log.info('Подключение к qBittorrent установлено', { version })

    // Категория для отделения торрентов Animatrona от добавленных пользователем напрямую
    try {
      await this.client.createCategory(ANIMATRONA_TORRENT_CATEGORY)
    } catch (err) {
      log.warn('Не удалось создать категорию qBittorrent', { error: String(err) })
    }

    // Восстанавливаем мета из БД
    await this.restoreFromDb()

    // Стартуем polling
    this.startPolling()
    this.initialized = true
  }

  /** Остановить клиент (таймеры, не убивает qBittorrent) */
  async destroy(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    // Flush все отложенные persist
    for (const [hash, timer] of this.persistTimers.entries()) {
      clearTimeout(timer)
      const meta = this.meta.get(hash)
      if (meta) {
        await this.persistToDb(hash, meta).catch((err) => log.warn('persistToDb при destroy', { err: String(err) }))
      }
    }
    this.persistTimers.clear()
    this.client = null
    this.initialized = false
    this.lastSnapshot.clear()
    this.completedFiles.clear()
    this.completedTorrents.clear()
    log.info('QBittorrentService остановлен')
  }

  /** Проверить подключение */
  isConnected(): boolean {
    return this.client?.isConnected() ?? false
  }

  // ========================
  // Публичный API (совместим с TorrentService)
  // ========================

  /** Добавить торрент по магнет-ссылке */
  async add(magnetURI: string, options: AddTorrentOptions): Promise<TorrentInfo> {
    this.ensureClient()

    const targetRatio = options.targetRatio ?? DEFAULT_TARGET_RATIO
    const hash = await this.client!.addMagnet({
      urls: magnetURI,
      savepath: options.downloadPath,
      sequentialDownload: options.sequential ?? false,
      category: ANIMATRONA_TORRENT_CATEGORY,
    })

    // Сохраняем мета
    const meta: TorrentMeta = {
      addedAt: Date.now(),
      targetRatio,
      downloadPath: options.downloadPath,
      magnetURI,
      importStatus: 'none',
      isBundle: options.isBundle,
      bundleAnimesJson: options.bundleAnimesJson,
    }
    this.meta.set(hash, meta)

    // Устанавливаем target ratio на стороне qBittorrent
    try {
      await this.client!.setShareLimits([hash], targetRatio)
    } catch (err) {
      log.warn('Не удалось установить share limits', { hash, error: String(err) })
    }

    // Отменяем debounce от polling recovery (если успел сработать до meta.set)
    const pendingTimer = this.persistTimers.get(hash)
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      this.persistTimers.delete(hash)
    }
    // Persist в БД сразу (не debounced — важно, чтобы при рестарте мета была)
    await this.persistToDb(hash, meta)

    // Пытаемся получить реальные данные (может быть ещё нет — metaDL)
    const info = (await this.client!.getTorrentInfo(hash)) ?? this.buildFallbackInfo(hash, meta)
    const torrentInfo = this.buildTorrentInfo(hash, info, meta)

    // Эмитим событие
    this.emit('torrent:added', torrentInfo)
    log.info('Торрент добавлен', {
      hash,
      name: torrentInfo.name,
      isBundle: torrentInfo.isBundle,
      bundleAnimesJsonLength: torrentInfo.bundleAnimesJson?.length ?? 0,
    })

    return torrentInfo
  }

  /** Приостановить торрент */
  pause(infoHash: string): boolean {
    if (!this.client) {
      return false
    }
    this.client.pause([infoHash]).catch((err) => log.warn('pause failed', { infoHash, err: String(err) }))
    return true
  }

  /** Возобновить торрент */
  resume(infoHash: string): boolean {
    if (!this.client) {
      return false
    }
    this.client.resume([infoHash]).catch((err) => log.warn('resume failed', { infoHash, err: String(err) }))
    return true
  }

  /** Перепроверить торрент */
  recheck(infoHash: string): boolean {
    if (!this.client) {
      return false
    }
    this.client.recheck([infoHash]).catch((err) => log.warn('recheck failed', { infoHash, err: String(err) }))
    return true
  }

  /** Удалить торрент (с файлами или без) */
  async remove(infoHash: string, deleteFiles = false): Promise<boolean> {
    if (!this.client) {
      return false
    }
    try {
      await this.client.delete([infoHash], deleteFiles)
    } catch (err) {
      log.error('Ошибка удаления торрента', { infoHash, error: String(err) })
      return false
    }

    // Убираем мету и снапшот
    this.meta.delete(infoHash)
    this.lastSnapshot.delete(infoHash)
    this.completedTorrents.delete(infoHash)
    // Очищаем completedFiles для этого торрента
    for (const key of this.completedFiles) {
      if (key.startsWith(`${infoHash}:`)) {
        this.completedFiles.delete(key)
      }
    }

    // Удаляем из БД
    try {
      await prisma.torrentDownload.delete({ where: { infoHash } }).catch(() => {
        // ignore — могло не существовать
      })
    } catch {
      /* ignore */
    }

    this.emit('torrent:removed', { infoHash })
    log.info('Торрент удалён', { infoHash, deleteFiles })
    return true
  }

  /** Получить информацию об одном торренте (из последнего snapshot) */
  get(infoHash: string): TorrentInfo | null {
    const info = this.lastSnapshot.get(infoHash)
    const meta = this.meta.get(infoHash)
    if (!info || !meta) {
      return null
    }
    return this.buildTorrentInfo(infoHash, info, meta)
  }

  /** Получить все торренты */
  getAll(): TorrentInfo[] {
    const result: TorrentInfo[] = []
    for (const [hash, info] of this.lastSnapshot.entries()) {
      const meta = this.meta.get(hash)
      if (meta) {
        result.push(this.buildTorrentInfo(hash, info, meta))
      }
    }
    return result
  }

  /** Обновить пользовательские мета-поля (shikimoriId, animeName, rutrackerUrl, importStatus, isBundle) */
  updateMeta(
    infoHash: string,
    update: {
      shikimoriId?: number
      animeName?: string
      importStatus?: TorrentImportStatus
      rutrackerUrl?: string
      isBundle?: boolean
      bundleAnimesJson?: string
    }
  ): void {
    const meta = this.meta.get(infoHash)
    if (!meta) {
      log.warn('updateMeta: торрент не найден', { infoHash })
      return
    }

    if (update.shikimoriId !== undefined) {
      meta.shikimoriId = update.shikimoriId
    }
    if (update.animeName !== undefined) {
      meta.animeName = update.animeName
    }
    if (update.importStatus !== undefined) {
      meta.importStatus = update.importStatus
    }
    if (update.rutrackerUrl !== undefined) {
      meta.rutrackerUrl = update.rutrackerUrl
    }
    if (update.isBundle !== undefined) {
      meta.isBundle = update.isBundle
    }
    if (update.bundleAnimesJson !== undefined) {
      meta.bundleAnimesJson = update.bundleAnimesJson
    }
    this.debouncedPersistToDb(infoHash, meta)
  }

  /** Получить метаданные торрента (для оркестратора) */
  getShikimoriMeta(infoHash: string): {
    shikimoriId?: number
    animeName?: string
    rutrackerUrl?: string
    isBundle?: boolean
    bundleAnimesJson?: string
    torrentFileCid?: string
  } | null {
    const meta = this.meta.get(infoHash)
    if (!meta) {
      return null
    }
    return {
      shikimoriId: meta.shikimoriId,
      animeName: meta.animeName,
      rutrackerUrl: meta.rutrackerUrl,
      isBundle: meta.isBundle,
      bundleAnimesJson: meta.bundleAnimesJson,
      torrentFileCid: meta.torrentFileCid,
    }
  }

  /** Получить список файлов торрента через qBittorrent API */
  async getTorrentFiles(infoHash: string) {
    return this.client.getFiles(infoHash)
  }

  /** Получить comment раздачи (часто содержит ссылку на страницу источника у торрентов, добавленных вручную) */
  async getTorrentComment(infoHash: string): Promise<string> {
    this.ensureClient()
    const props = await this.client!.getProperties(infoHash)
    return props.comment ?? ''
  }

  /**
   * Экспортировать .torrent файл раздачи и залить в IPFS (pin: false — станет indirect
   * после того как войдёт в directoryCid аниме через anime-directory-builder).
   *
   * Требует qBittorrent 4.5+. На более старых версиях export вернёт 404 — источник
   * (rutrackerUrl) при этом всё равно сохранится, просто без самого .torrent файла.
   */
  private async exportAndUploadTorrentFile(hash: string, meta: TorrentMeta): Promise<void> {
    if (!this.client) {
      return
    }
    try {
      const bytes = await this.client.exportTorrent(hash)
      const cid = await addBytes(bytes, { pin: false })
      meta.torrentFileCid = cid
      await this.persistToDb(hash, meta)
      log.info('.torrent файл экспортирован и залит в IPFS', { hash, cid })
    } catch (err) {
      if (err instanceof QBittorrentRequestError && err.status === 404) {
        log.warn('qBittorrent не поддерживает /torrents/export — обновите qBittorrent до версии 4.5 или новее', {
          hash,
        })
      } else {
        log.warn('Не удалось экспортировать .torrent файл', { hash, error: String(err) })
      }
    }
  }

  // ========================
  // Polling loop
  // ========================

  private startPolling(): void {
    if (this.pollTimer) {
      return
    }
    // Первый вызов сразу
    void this.pollOnce()
    this.pollTimer = setInterval(() => void this.pollOnce(), POLL_INTERVAL)
  }

  /**
   * Один раунд polling.
   *
   * Забирает дельту через /sync/maindata, применяет изменения к локальному snapshot,
   * эмитит события:
   * - torrent:progress — для каждого торрента с обновлением
   * - torrent:done — когда progress достиг 1
   * - file:complete — когда отдельный файл достиг progress 1 (требует getFiles)
   * - torrent:error — при state === 'error'
   * - torrent:removed — уже обрабатывается в remove()
   */
  private async pollOnce(): Promise<void> {
    if (!this.client?.isConnected()) {
      return
    }

    let sync
    try {
      sync = await this.client.syncMainData(this.lastRid)
    } catch (err) {
      log.warn('syncMainData failed', { error: String(err) })
      return
    }

    this.lastRid = sync.rid

    // Полный апдейт — заменяем весь snapshot
    if (sync.full_update) {
      this.lastSnapshot.clear()
    }

    // Применяем дельту для каждого торрента
    if (sync.torrents) {
      for (const [hash, delta] of Object.entries(sync.torrents)) {
        const prev = this.lastSnapshot.get(hash)
        // Объединяем дельту с предыдущим состоянием
        const merged: QBTorrentInfo = {
          ...(prev ?? this.emptyTorrentInfo(hash)),
          ...(delta as Partial<QBTorrentInfo>),
        }
        this.lastSnapshot.set(hash, merged)

        const meta = this.meta.get(hash)
        if (!meta) {
          // Торрент есть в qBittorrent, но нет в мете — возможно, добавлен извне или мета потеряна.
          // Восстанавливаем минимальную мету, чтобы он отображался в UI.
          const recoveredMeta: TorrentMeta = {
            addedAt: (merged.added_on ?? Math.floor(Date.now() / 1000)) * 1000,
            targetRatio: DEFAULT_TARGET_RATIO,
            downloadPath: merged.save_path ?? '',
            magnetURI: merged.magnet_uri ?? '',
            importStatus: 'none',
          }
          this.meta.set(hash, recoveredMeta)
          this.debouncedPersistToDb(hash, recoveredMeta)
          continue
        }

        // Эмит прогресса
        const info = this.buildTorrentInfo(hash, merged, meta)
        this.emit('torrent:progress', {
          infoHash: hash,
          progress: info.progress,
          downloadSpeed: info.downloadSpeed,
          uploadSpeed: info.uploadSpeed,
          numPeers: info.numPeers,
          downloaded: info.downloaded,
          uploaded: info.uploaded,
          ratio: info.ratio,
          status: info.status,
        })

        // Эмит torrent:done при достижении progress === 1 (один раз)
        if (merged.progress !== undefined && merged.progress >= 1 && !this.completedTorrents.has(hash)) {
          this.completedTorrents.add(hash)
          log.info('Торрент завершён', { hash, name: merged.name })
          this.emit('torrent:done', info)
        }

        // Эмит torrent:error
        if (merged.state === 'error' || merged.state === 'missingFiles') {
          this.emit('torrent:error', { infoHash: hash, error: merged.state })
        }

        // Метаданные раздачи получены (имя и размер стали известны) — экспортируем .torrent
        // файл и заливаем в IPFS, пока раздача ещё существует в qBittorrent. Один раз на хэш.
        if (merged.name && merged.size > 0 && !this.exportedTorrentFile.has(hash)) {
          this.exportedTorrentFile.add(hash)
          void this.exportAndUploadTorrentFile(hash, meta)
        }

        // Для активных торрентов проверяем завершение отдельных файлов
        if (merged.progress !== undefined && merged.progress > 0 && merged.progress < 1) {
          // Не await — проверяем файлы параллельно, не блокируя polling
          void this.checkFileCompletion(hash, merged.save_path ?? meta.downloadPath)
        }

        // Debounced persist мета (если статус изменился)
        this.debouncedPersistToDb(hash, meta)
      }
    }

    // Обработка удалённых торрентов (извне через qBittorrent UI)
    if (sync.torrents_removed) {
      for (const hash of sync.torrents_removed) {
        this.lastSnapshot.delete(hash)
        this.meta.delete(hash)
        this.completedTorrents.delete(hash)
        this.emit('torrent:removed', { infoHash: hash })
        try {
          await prisma.torrentDownload.delete({ where: { infoHash: hash } }).catch(() => {
            // ignore — могло не существовать
          })
        } catch {
          /* ignore */
        }
      }
    }
  }

  /**
   * Проверить завершение отдельных файлов торрента.
   *
   * Вызывается для активных торрентов (не завершённых целиком). Если файл достиг
   * progress === 1 — эмитим file:complete для orchestrator.
   */
  private async checkFileCompletion(hash: string, savePath: string): Promise<void> {
    if (!this.client) {
      return
    }
    try {
      const files = await this.client.getFiles(hash)
      for (const file of files) {
        const key = `${hash}:${file.index}`
        if (file.progress >= 1 && !this.completedFiles.has(key)) {
          this.completedFiles.add(key)
          const filePath = `${savePath.replace(/[\\/]+$/, '')}/${file.name}`
          log.info('Файл торрента завершён', { hash, fileIndex: file.index, name: file.name })
          this.emit('file:complete', {
            hash,
            fileIndex: file.index,
            fileName: file.name,
            filePath,
            fileSize: file.size,
          } satisfies FileCompleteEvent)
        }
      }
    } catch (err) {
      log.debug('getFiles failed', { hash, error: String(err) })
    }
  }

  // ========================
  // БД (Prisma)
  // ========================

  /** Восстановить мету из БД при старте */
  private async restoreFromDb(): Promise<void> {
    try {
      const records = await prisma.torrentDownload.findMany()
      for (const rec of records) {
        const meta: TorrentMeta = {
          addedAt: rec.addedAt.getTime(),
          targetRatio: rec.targetRatio,
          downloadPath: rec.downloadPath,
          magnetURI: rec.magnetURI,
          shikimoriId: rec.shikimoriId ?? undefined,
          animeName: rec.animeName ?? undefined,
          rutrackerUrl: rec.rutrackerUrl ?? undefined,
          isBundle: rec.isBundle ?? false,
          bundleAnimesJson: rec.bundleAnimesJson ?? undefined,
          importStatus: (rec.importStatus as TorrentImportStatus) ?? 'none',
          error: rec.error ?? undefined,
          torrentFileCid: rec.torrentFileCid ?? undefined,
        }
        this.meta.set(rec.infoHash, meta)
        if (meta.torrentFileCid) {
          // Уже экспортирован в прошлой сессии — не пытаемся повторно
          this.exportedTorrentFile.add(rec.infoHash)
        }
      }
      log.info('Мета восстановлена из БД', { count: records.length })
    } catch (err) {
      log.error('Не удалось восстановить мету из БД', { error: String(err) })
    }
  }

  /** Сохранить мету в БД (дебаунс 5 сек) */
  private debouncedPersistToDb(infoHash: string, meta: TorrentMeta): void {
    const existingTimer = this.persistTimers.get(infoHash)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }
    const timer = setTimeout(() => {
      void this.persistToDb(infoHash, meta).catch((err) =>
        log.warn('persistToDb failed', { infoHash, error: String(err) })
      )
      this.persistTimers.delete(infoHash)
    }, DB_PERSIST_DEBOUNCE)
    this.persistTimers.set(infoHash, timer)
  }

  /** Реальная запись в БД */
  private async persistToDb(infoHash: string, meta: TorrentMeta): Promise<void> {
    const info = this.lastSnapshot.get(infoHash)
    const status: TorrentStatus = info ? mapQBStateToStatus(info.state) : 'adding'
    const name = info?.name ?? meta.animeName ?? 'Unknown'

    try {
      await prisma.torrentDownload.upsert({
        where: { infoHash },
        create: {
          infoHash,
          magnetURI: meta.magnetURI,
          name,
          downloadPath: meta.downloadPath,
          status,
          importStatus: meta.importStatus ?? 'none',
          targetRatio: meta.targetRatio,
          shikimoriId: meta.shikimoriId,
          animeName: meta.animeName,
          rutrackerUrl: meta.rutrackerUrl,
          isBundle: meta.isBundle ?? false,
          bundleAnimesJson: meta.bundleAnimesJson,
          error: meta.error,
          torrentFileCid: meta.torrentFileCid,
          addedAt: new Date(meta.addedAt),
        },
        update: {
          name,
          status,
          importStatus: meta.importStatus ?? 'none',
          targetRatio: meta.targetRatio,
          shikimoriId: meta.shikimoriId,
          animeName: meta.animeName,
          rutrackerUrl: meta.rutrackerUrl,
          isBundle: meta.isBundle ?? false,
          bundleAnimesJson: meta.bundleAnimesJson,
          error: meta.error,
          torrentFileCid: meta.torrentFileCid,
        },
      })
    } catch (err) {
      log.warn('persistToDb error', { infoHash, error: String(err) })
    }
  }

  /** Загрузить конфиг qBittorrent из Settings */
  private async loadConfigFromSettings(): Promise<QBittorrentConfig | null> {
    try {
      // Settings — singleton-подобная таблица; используем findFirst
      const settings = await prisma.settings.findFirst()
      // Поля пока не добавлены в schema (Фаза 3). Используем any и проверку.
      const s = settings as unknown as {
        qbittorrentUrl?: string | null
        qbittorrentUsername?: string | null
        qbittorrentPassword?: string | null
      } | null

      if (!s?.qbittorrentUrl || !s.qbittorrentUsername) {
        return null
      }
      return {
        url: s.qbittorrentUrl,
        username: s.qbittorrentUsername,
        password: s.qbittorrentPassword ?? '',
      }
    } catch (err) {
      log.warn('loadConfigFromSettings failed', { error: String(err) })
      return null
    }
  }

  // ========================
  // Helpers
  // ========================

  private ensureClient(): void {
    if (!this.client || !this.initialized) {
      throw new Error('QBittorrentService не инициализирован (вызовите init())')
    }
  }

  /** Построить TorrentInfo для renderer из QBTorrentInfo + meta */
  private buildTorrentInfo(hash: string, info: QBTorrentInfo, meta: TorrentMeta): TorrentInfo {
    return {
      infoHash: hash,
      name: info.name ?? meta.animeName ?? 'Unknown',
      totalSize: info.size ?? 0,
      downloaded: info.downloaded ?? 0,
      uploaded: info.uploaded ?? 0,
      progress: info.progress ?? 0,
      downloadSpeed: info.dlspeed ?? 0,
      uploadSpeed: info.upspeed ?? 0,
      numPeers: (info.num_seeds ?? 0) + (info.num_leechs ?? 0),
      ratio: info.ratio ?? 0,
      status: mapQBStateToStatus(info.state),
      path: info.save_path ?? meta.downloadPath,
      addedAt: meta.addedAt,
      magnetURI: meta.magnetURI,
      files: [], // файлы не включаем в базовый прогресс (загружаются отдельно при expand)
      importStatus: meta.importStatus ?? 'none',
      animeName: meta.animeName,
      shikimoriId: meta.shikimoriId,
      rutrackerUrl: meta.rutrackerUrl,
      isBundle: meta.isBundle ?? false,
      bundleAnimesJson: meta.bundleAnimesJson,
      error: meta.error,
      category: info.category,
    }
  }

  /** Построить fallback TorrentInfo при только что добавленном торренте (qBittorrent ещё не вернул info) */
  private buildFallbackInfo(hash: string, meta: TorrentMeta): QBTorrentInfo {
    return {
      ...this.emptyTorrentInfo(hash),
      save_path: meta.downloadPath,
      magnet_uri: meta.magnetURI,
      added_on: Math.floor(meta.addedAt / 1000),
    }
  }

  /** Пустая заглушка QBTorrentInfo (для merge с дельтой) */
  private emptyTorrentInfo(hash: string): QBTorrentInfo {
    return {
      hash,
      name: '',
      state: 'unknown',
      progress: 0,
      dlspeed: 0,
      upspeed: 0,
      eta: 0,
      ratio: 0,
      size: 0,
      downloaded: 0,
      uploaded: 0,
      added_on: 0,
      completion_on: 0,
      save_path: '',
      category: '',
      tags: '',
      num_seeds: 0,
      num_leechs: 0,
    }
  }
}

/**
 * Маппинг состояния qBittorrent → TorrentStatus Animatrona
 */
export function mapQBStateToStatus(state: QBTorrentState | undefined): TorrentStatus {
  switch (state) {
    case 'downloading':
    case 'stalledDL':
    case 'metaDL':
    case 'forcedDL':
    case 'queuedDL':
    case 'allocating':
      return 'downloading'

    case 'uploading':
    case 'stalledUP':
    case 'forcedUP':
    case 'queuedUP':
      return 'seeding'

    case 'pausedDL':
    case 'stoppedDL':
    case 'pausedUP':
    case 'stoppedUP':
      return 'paused'

    case 'checkingDL':
    case 'checkingUP':
    case 'checkingResumeData':
    case 'moving':
      return 'checking'

    case 'error':
    case 'missingFiles':
      return 'error'

    default:
      return 'adding'
  }
}

/** Удобная функция доступа к singleton */
export function getQBittorrentService(): QBittorrentService {
  return QBittorrentService.getInstance()
}
