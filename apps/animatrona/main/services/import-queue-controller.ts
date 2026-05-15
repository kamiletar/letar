/**
 * ImportQueueController — координатор очереди импорта
 *
 * Event-driven архитектура:
 * - Main process хранит очередь и статусы (единственный источник правды)
 * - Renderer только отображает и отправляет команды
 * - При F5 renderer получает актуальное состояние из main
 *
 * События (main → renderer):
 * - import-queue:state-changed — полное состояние изменилось
 * - import-queue:item-status — статус одного item изменился
 * - import-queue:item-progress — прогресс одного item изменился
 *
 * Команды (renderer → main через IPC handlers):
 * - addItems — добавить items в очередь
 * - startQueue — начать обработку
 * - pauseQueue — приостановить
 * - cancelItem — отменить item
 * - getState — получить текущее состояние
 */

import { BrowserWindow } from 'electron'
import { EventEmitter } from 'events'
import type {
  ImportQueueAddData,
  ImportQueueDetailProgress,
  ImportQueueEntry,
  ImportQueueState,
  ImportQueueStatus,
  ImportQueueVmafProgress,
  ImportQueueVmafResult,
} from '../../shared/types/import-queue'
import type { CqSearchProgress } from '../../shared/types/vmaf'
import { buildAnime4KFilter, getAnime4KShaderPath, isAnime4KAvailable } from '../ffmpeg/anime4k'
import { setPowerSaveTranscoding } from '../ipc/app.handlers'
import { findOptimalCQ } from '../src/ffmpeg'
import { prisma } from '../utils/db'
import { createModuleLogger } from '../utils/logger'
import { addHistoryEntry } from './history-store'
import {
  notifyImportCompleted,
  notifyImportError,
  notifyImportWarning,
  notifyQueueCompleted,
} from './import-queue-notifications'
import { markTorrentImported, resetTorrentImportStatus } from './import-queue-torrent'
import { ImportService } from './import/import-service'
import { prewarmCache } from './ipfs/image-uploader'

const log = createModuleLogger('ImportQueue')

/**
 * Контроллер очереди импорта
 * Singleton — живёт всё время работы приложения
 */
export class ImportQueueController extends EventEmitter {
  private static instance: ImportQueueController | null = null

  /** Очередь items (Map для быстрого доступа по id) */
  private queue: Map<string, ImportQueueEntry> = new Map()

  /** ID текущего обрабатываемого item */
  private currentId: string | null = null

  /** Очередь на паузе */
  private isPaused = false

  /** Автозапуск при добавлении */
  private autoStart = true

  /** Счётчик приоритетов */
  private priorityCounter = 0

  // === Throttle для событий прогресса (предотвращение утечки памяти) ===

  /** Время последней отправки прогресса для каждого item */
  private lastItemProgressEmit: Map<string, number> = new Map()

  /** Последняя отправленная сумма прогресса воркеров (для throttle detailProgress) */
  private lastWorkersProgressSum: Map<string, number> = new Map()

  /** Минимальный интервал между отправками прогресса item (мс) — 4 раза/сек */
  private readonly ITEM_PROGRESS_INTERVAL = 250

  /** Флаг — была ли хоть одна обработка (для нотификации "очередь завершена") */
  private hadProcessing = false

  /** ImportService — оркестратор импорта в main process */
  private importService: ImportService

  private constructor() {
    super()
    this.importService = new ImportService(this)
    this.loadFromDb().catch((err) => log.error('Ошибка загрузки очереди из БД', { error: String(err) }))
    log.info('Initialized')
  }

  /** Singleton */
  static getInstance(): ImportQueueController {
    if (!ImportQueueController.instance) {
      ImportQueueController.instance = new ImportQueueController()
    }
    return ImportQueueController.instance
  }

  // ==========================================
  // === Команды от renderer ===
  // ==========================================

  /**
   * Добавить items в очередь
   */
  addItems(items: ImportQueueAddData[]): void {
    const now = new Date().toISOString()

    for (const itemData of items) {
      const id = crypto.randomUUID()
      const entry: ImportQueueEntry = {
        ...itemData,
        id,
        status: 'pending',
        priority: this.priorityCounter++,
        addedAt: now,
      }

      // Защита от дублей по folderPath + anime ID (разные аниме из одной папки допускаются)
      // Для isRetranscode — пропускаем проверку (повторный импорт в существующее аниме)
      if (!entry.isRetranscode) {
        const existingByPath = [...this.queue.values()].find(
          (i) =>
            i.folderPath === entry.folderPath
            && i.selectedAnime.id === entry.selectedAnime.id
            && i.status !== 'completed'
            && i.status !== 'error',
        )
        if (existingByPath) {
          log.warn('Item already in queue, skipping', { path: entry.folderPath })
          continue
        }
      }

      this.queue.set(id, entry)
      this.saveItemToDb(entry).catch(() => {
        /* игнорируем ошибку БД */
      })
      log.info('Added item', { id, anime: entry.selectedAnime.russian || entry.selectedAnime.name })
    }

    this.emitStateChanged()

    // Автозапуск если включён и нет активной обработки
    if (this.autoStart && !this.currentId && !this.isPaused) {
      this.startQueue()
    }
  }

  /**
   * Начать обработку очереди
   */
  startQueue(): void {
    if (this.currentId) {
      log.info('Queue already processing')
      return
    }

    this.isPaused = false
    this.processNext().catch((err) => log.error('processNext error', { error: String(err) }))
  }

  /**
   * Приостановить очередь (текущий item завершится)
   */
  pauseQueue(): void {
    this.isPaused = true
    this.emitStateChanged()
  }

  /**
   * Возобновить очередь
   */
  resumeQueue(): void {
    this.isPaused = false
    if (!this.currentId) {
      this.processNext().catch((err) => log.error('processNext error', { error: String(err) }))
    }
    this.emitStateChanged()
  }

  /**
   * Отменить item
   */
  cancelItem(itemId: string): void {
    const item = this.queue.get(itemId)
    if (!item) {
      log.warn('Item not found', { itemId })
      return
    }

    // Если это текущий обрабатываемый — отменяем ImportService и переходим к следующему
    if (this.currentId === itemId) {
      this.updateItemStatus(itemId, 'cancelled')
      // Отменяем ImportService — остановит FFmpeg и запустит cleanup (удаление из БД и IPFS)
      this.importService.cancel().catch((err) => log.error('Cancel error', { error: String(err) }))
      this.currentId = null
      this.processNext().catch((err) => log.error('processNext error', { error: String(err) }))
    } else {
      this.updateItemStatus(itemId, 'cancelled')
    }
  }

  /**
   * Удалить item из очереди
   */
  removeItem(itemId: string): void {
    if (this.currentId === itemId) {
      log.warn('Cannot remove currently processing item', { itemId })
      return
    }

    this.queue.delete(itemId)
    this.deleteItemFromDb(itemId).catch(() => {
      /* игнорируем ошибку БД */
    })
    this.emitStateChanged()
  }

  /**
   * Повторить обработку item с ошибкой
   * Сбрасывает статус на pending и очищает ошибки
   */
  retryItem(itemId: string, options?: { skipCompressionCheck?: boolean }): void {
    const item = this.queue.get(itemId)
    if (!item) {
      log.warn('Item not found for retry', { itemId })
      return
    }

    // Можно повторять только error или cancelled items
    if (item.status !== 'error' && item.status !== 'cancelled') {
      log.warn('Cannot retry item with this status', { itemId, status: item.status })
      return
    }

    // Сбрасываем item в исходное состояние
    item.status = 'pending'
    item.error = undefined
    item.progress = undefined
    item.currentFileName = undefined
    item.currentStage = undefined
    item.detailProgress = undefined
    item.startedAt = undefined
    item.completedAt = undefined
    // vmafResult сохраняем — не нужно повторно подбирать CQ

    // Флаг игнорирования сжатия передаётся при необходимости
    if (options?.skipCompressionCheck) {
      item.skipCompressionCheck = true
      // vmafResult сбрасываем — нужно повторно подобрать CQ с флагом
      item.vmafResult = undefined
    }

    log.info('Retrying item', { itemId, anime: item.selectedAnime.russian || item.selectedAnime.name })

    this.saveItemToDb(item).catch(() => {
      /* игнорируем ошибку БД */
    })
    this.emitStateChanged()

    // Автозапуск если включён и нет активной обработки
    if (this.autoStart && !this.currentId && !this.isPaused) {
      this.startQueue()
    }
  }

  /**
   * Пометить завершённый item как failed (для повторного импорта)
   * Также удаляет созданное аниме и эпизоды из БД
   */
  markItemFailed(itemId: string): void {
    const item = this.queue.get(itemId)
    if (!item) {
      log.warn('Item not found for markFailed', { itemId })
      return
    }

    if (item.status !== 'completed') {
      log.warn('markItemFailed: only completed items', { itemId, status: item.status })
      return
    }

    item.status = 'error'
    item.error = 'Помечен как неудачный для повторного импорта'
    item.completedAt = undefined

    log.info('Marked item as failed', { itemId, anime: item.selectedAnime.russian || item.selectedAnime.name })

    this.saveItemToDb(item).catch(() => {
      /* игнорируем ошибку БД */
    })
    this.emitStateChanged()
  }

  /**
   * Аудит завершённых items — найти неполные эпизоды и пометить warning
   *
   * Проверяет: видео, манифест, аудио (non-passthrough), субтитры, шрифты
   */
  async auditCompletedItems(): Promise<{ checked: number; markedFailed: number }> {
    let checked = 0
    let markedFailed = 0
    let stateChanged = false

    for (const item of this.queue.values()) {
      if (item.status !== 'completed' || !item.createdAnimeId) {
        continue
      }
      checked++

      try {
        const episodes = await prisma.episode.findMany({
          where: { animeId: item.createdAnimeId },
          select: {
            id: true,
            number: true,
            transcodedCid: true,
            manifestCid: true,
            audioTracks: { select: { id: true, transcodedCid: true } },
            subtitleTracks: {
              select: {
                id: true,
                fileCid: true,
                fonts: { select: { id: true, fileCid: true } },
              },
            },
          },
        })

        const incompleteDetails: string[] = []

        for (const ep of episodes) {
          const missing: string[] = []

          if (!ep.transcodedCid) {
            missing.push('видео')
          }
          if (!ep.manifestCid) {
            missing.push('манифест')
          }

          // Аудио без transcodedCid
          const missingAudio = ep.audioTracks.filter((at) => !at.transcodedCid)
          if (missingAudio.length > 0) {
            missing.push(`${missingAudio.length} аудио`)
          }

          // Субтитры без fileCid
          const missingSubs = ep.subtitleTracks.filter((st) => !st.fileCid)
          if (missingSubs.length > 0) {
            missing.push(`${missingSubs.length} субтитров`)
          }

          // Шрифты без fileCid
          const missingFonts = ep.subtitleTracks.flatMap((st) => st.fonts).filter((f) => !f.fileCid)
          if (missingFonts.length > 0) {
            missing.push(`${missingFonts.length} шрифтов`)
          }

          if (missing.length > 0) {
            incompleteDetails.push(`#${ep.number} (${missing.join(', ')})`)
          }
        }

        if (incompleteDetails.length > 0) {
          const animeName = item.selectedAnime.russian || item.selectedAnime.name
          const warning = `${incompleteDetails.length} эп. неполные: ${incompleteDetails.join(', ')}`

          log.warn(`Аудит: ${animeName} — ${warning}`)
          item.error = warning
          this.saveItemToDb(item).catch(() => {})
          markedFailed++
        } else if (item.error) {
          // Все эпизоды полные — снять устаревший warning
          log.info('Аудит: warning снят, все эпизоды полные', { itemId: item.id })
          item.error = undefined
          this.saveItemToDb(item).catch(() => {})
          stateChanged = true
        }
      } catch (err) {
        log.warn('Аудит: ошибка проверки', { itemId: item.id, error: String(err) })
      }
    }

    if (markedFailed > 0 || stateChanged) {
      this.emitStateChanged()
    }

    log.info(`Аудит завершён: проверено ${checked}, с проблемами ${markedFailed}`)
    return { checked, markedFailed }
  }

  /**
   * Пере-аудитить оригинальный item после успешного retranscode.
   * Если все эпизоды теперь полные — снять warning (error).
   */
  private reauditOriginalItem(animeId: string): void {
    // Найти оригинальный completed item по createdAnimeId
    const original = [...this.queue.values()].find(
      (i) => i.status === 'completed' && i.createdAnimeId === animeId && !i.isRetranscode,
    )
    if (!original) return

    // Запустить аудит асинхронно
    this.auditSingleItem(original).catch((err) =>
      log.warn('Ре-аудит оригинального item не удался', { error: String(err) })
    )
  }

  /**
   * Аудит одного completed item — обновить или снять warning
   */
  private async auditSingleItem(item: ImportQueueEntry): Promise<void> {
    const episodes = await prisma.episode.findMany({
      where: { animeId: item.createdAnimeId! },
      select: {
        id: true,
        number: true,
        transcodedCid: true,
        manifestCid: true,
        audioTracks: { select: { id: true, transcodedCid: true } },
        subtitleTracks: {
          select: {
            id: true,
            fileCid: true,
            fonts: { select: { id: true, fileCid: true } },
          },
        },
      },
    })

    const incompleteDetails: string[] = []
    for (const ep of episodes) {
      const missing: string[] = []
      if (!ep.transcodedCid) missing.push('видео')
      if (!ep.manifestCid) missing.push('манифест')
      const missingAudio = ep.audioTracks.filter((at) => !at.transcodedCid)
      if (missingAudio.length > 0) missing.push(`${missingAudio.length} аудио`)
      const missingSubs = ep.subtitleTracks.filter((st) => !st.fileCid)
      if (missingSubs.length > 0) missing.push(`${missingSubs.length} субтитров`)
      const missingFonts = ep.subtitleTracks.flatMap((st) => st.fonts).filter((f) => !f.fileCid)
      if (missingFonts.length > 0) missing.push(`${missingFonts.length} шрифтов`)
      if (missing.length > 0) incompleteDetails.push(`#${ep.number} (${missing.join(', ')})`)
    }

    if (incompleteDetails.length > 0) {
      item.error = `${incompleteDetails.length} эп. неполные: ${incompleteDetails.join(', ')}`
    } else {
      // Все эпизоды полные — снять warning
      item.error = undefined
      log.info('Ре-аудит: все эпизоды полные, warning снят', { animeId: item.createdAnimeId })
    }

    this.saveItemToDb(item).catch(() => {})
    this.emitStateChanged()
  }

  /**
   * Переделать недостающие эпизоды — создать новый entry с isRetranscode=true
   *
   * Находит неполные эпизоды в completed item, создаёт новый entry
   * только с этими файлами для повторной обработки.
   */
  async retryMissingEpisodes(
    itemId: string,
    preEncodeOptions?: { enabled: boolean; crf?: number; preset?: string },
  ): Promise<{ newItemId?: string }> {
    const item = this.queue.get(itemId)
    if (!item) {
      throw new Error('Item не найден')
    }

    if (item.status !== 'completed') {
      throw new Error('Только completed items можно переделать')
    }

    if (!item.createdAnimeId) {
      throw new Error('Нет createdAnimeId — аниме не было создано')
    }

    // Защита от дубликата — уже есть pending/active retranscode для этого аниме
    const existingRetranscode = [...this.queue.values()].find(
      (i) =>
        i.isRetranscode
        && i.existingAnimeId === item.createdAnimeId
        && !['completed', 'error', 'cancelled'].includes(i.status),
    )
    if (existingRetranscode) {
      throw new Error('Retranscode уже в очереди')
    }

    // Полный аудит эпизодов
    const episodes = await prisma.episode.findMany({
      where: { animeId: item.createdAnimeId },
      select: {
        id: true,
        number: true,
        transcodedCid: true,
        manifestCid: true,
        audioTracks: { select: { id: true, transcodedCid: true } },
        subtitleTracks: {
          select: {
            id: true,
            fileCid: true,
            fonts: { select: { id: true, fileCid: true } },
          },
        },
      },
    })

    // Определить неполные эпизоды
    const incompleteNumbers: number[] = []
    for (const ep of episodes) {
      const hasIssue = !ep.transcodedCid
        || !ep.manifestCid
        || ep.audioTracks.some((at) => !at.transcodedCid)
        || ep.subtitleTracks.some((st) => !st.fileCid)
        || ep.subtitleTracks.some((st) => st.fonts.some((f) => !f.fileCid))

      if (hasIssue) {
        incompleteNumbers.push(ep.number)
      }
    }

    if (incompleteNumbers.length === 0) {
      throw new Error('Все эпизоды полные — нечего переделывать')
    }

    // Сматчить с files по episodeNumber (только выбранные — иначе попадут NCOP/NCED)
    const missingFiles = item.files.filter(
      (f) => f.selected && f.episodeNumber !== null && incompleteNumbers.includes(f.episodeNumber),
    )

    if (missingFiles.length === 0) {
      throw new Error(
        `Неполные эпизоды: ${incompleteNumbers.map((n) => `#${n}`).join(', ')}, но исходные файлы не найдены в очереди`,
      )
    }

    // Проверить существование исходных файлов
    const { existsSync } = await import('node:fs')
    const missingPaths: string[] = []
    for (const f of missingFiles) {
      if (!existsSync(f.path)) {
        missingPaths.push(f.path)
      }
    }
    if (missingPaths.length > 0) {
      throw new Error(`Исходные файлы удалены: ${missingPaths.map((p) => p.split(/[\\/]/).pop()).join(', ')}`)
    }

    // Создать новый entry с isRetranscode
    const retranscodeFiles = missingFiles.map((f) => ({ ...f, selected: true }))

    const newEntry: ImportQueueAddData = {
      folderPath: item.folderPath,
      parsedInfo: item.parsedInfo,
      selectedAnime: item.selectedAnime,
      files: retranscodeFiles,
      importSettings: item.importSettings,
      vmafSettings: item.vmafSettings,
      encodingProfile: item.encodingProfile,
      fileAnalyses: item.fileAnalyses?.filter((fa) => incompleteNumbers.includes(fa.episodeNumber)),
      forceCpu: item.forceCpu,
      isFileMode: item.isFileMode,
      donorPath: item.donorPath,
      donorFiles: item.donorFiles,
      syncOffset: item.syncOffset,
      isRetranscode: true,
      existingAnimeId: item.createdAnimeId,
      vmafResult: item.vmafResult,
      // Pre-encode: пережать исходники в H264 перед основным транскодом
      preEncode: preEncodeOptions?.enabled,
      preEncodeCrf: preEncodeOptions?.crf,
      preEncodePreset: preEncodeOptions?.preset,
    }

    // Добавить в очередь (addItems обходит дубликат-проверку для isRetranscode)
    this.addItems([newEntry])

    // Найти добавленный entry (последний в очереди)
    const added = [...this.queue.values()].find(
      (i) => i.isRetranscode && i.existingAnimeId === item.createdAnimeId && i.status === 'pending',
    )

    const animeName = item.selectedAnime.russian || item.selectedAnime.name
    log.info('retryMissingEpisodes: создан retranscode entry', {
      itemId: added?.id,
      anime: animeName,
      missingEpisodes: incompleteNumbers,
    })

    return { newItemId: added?.id }
  }

  /**
   * Изменить порядок элементов в очереди (drag & drop)
   * @param activeId - ID перетаскиваемого элемента
   * @param overId - ID элемента, над которым отпустили
   */
  reorderItems(activeId: string, overId: string): void {
    if (activeId === overId) {
      return
    }

    const activeItem = this.queue.get(activeId)
    const overItem = this.queue.get(overId)

    if (!activeItem || !overItem) {
      log.warn('Cannot reorder: item not found')
      return
    }

    // Можно переупорядочивать только pending items
    if (activeItem.status !== 'pending' || overItem.status !== 'pending') {
      log.warn('Cannot reorder: only pending items can be reordered')
      return
    }

    // Получаем все pending items отсортированные по priority
    const pendingItems = [...this.queue.values()]
      .filter((item) => item.status === 'pending')
      .sort((a, b) => a.priority - b.priority)

    const oldIndex = pendingItems.findIndex((item) => item.id === activeId)
    const newIndex = pendingItems.findIndex((item) => item.id === overId)

    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    // Перемещаем элемент
    pendingItems.splice(oldIndex, 1)
    pendingItems.splice(newIndex, 0, activeItem)

    // Пересчитываем priorities и сохраняем в БД
    for (const [index, item] of pendingItems.entries()) {
      item.priority = index
      this.saveItemToDb(item).catch(() => {
        /* игнорируем ошибку БД */
      })
    }

    this.emitStateChanged()
    log.info('Reordered item', { activeId, newIndex })
  }

  /**
   * Отменить всю очередь
   */
  cancelAll(): void {
    // Отменяем все pending и processing items
    for (const [id, item] of this.queue) {
      if (
        item.status === 'pending'
        || item.status === 'vmaf'
        || item.status === 'preparing'
        || item.status === 'transcoding'
      ) {
        item.status = 'cancelled'
        item.completedAt = new Date().toISOString()
        this.saveItemToDb(item).catch(() => {
          /* игнорируем ошибку БД */
        })
        this.emitItemStatus(id, 'cancelled')
      }
    }

    this.currentId = null
    this.emitStateChanged()
    log.info('All items cancelled')
  }

  /**
   * Получить текущее состояние
   */
  getState(): ImportQueueState {
    return {
      items: [...this.queue.values()].sort((a, b) => a.priority - b.priority),
      currentId: this.currentId,
      isPaused: this.isPaused,
      autoStart: this.autoStart,
    }
  }

  /**
   * Получить item по ID
   */
  getItem(itemId: string): ImportQueueEntry | undefined {
    return this.queue.get(itemId)
  }

  /**
   * Установить автозапуск
   */
  setAutoStart(enabled: boolean): void {
    this.autoStart = enabled
  }

  // ==========================================
  // === Обновления от renderer ===
  // ==========================================

  /**
   * Обновить статус item (вызывается из renderer через IPC)
   */
  updateItemStatus(itemId: string, status: ImportQueueStatus, error?: string): void {
    const item = this.queue.get(itemId)
    if (!item) {
      log.warn('Item not found for status update', { itemId })
      return
    }

    const prevStatus = item.status
    item.status = status

    if (error) {
      item.error = error
    }

    // Обновляем временные метки
    if (status === 'preparing' && !item.startedAt) {
      item.startedAt = new Date().toISOString()
      this.hadProcessing = true
    }
    if (status === 'completed' || status === 'error' || status === 'cancelled') {
      item.completedAt = new Date().toISOString()

      // Desktop notifications и torrent tracking
      const animeName = item.selectedAnime.russian || item.selectedAnime.name
      if (status === 'completed') {
        if (error) {
          notifyImportWarning(animeName, error)
        } else {
          notifyImportCompleted(animeName)
        }
        // Помечаем торрент как импортированный (для авто-удаления по ratio)
        markTorrentImported(item.folderPath)

        // После retranscode — пере-аудитить оригинальный item
        if (item.isRetranscode && item.existingAnimeId) {
          this.reauditOriginalItem(item.existingAnimeId)
        }
      } else if (status === 'error') {
        notifyImportError(animeName, error)
        // Сбрасываем importStatus торрента чтобы можно было повторить
        resetTorrentImportStatus(item.folderPath)
      } else if (status === 'cancelled') {
        // Сбрасываем importStatus торрента при отмене
        resetTorrentImportStatus(item.folderPath)
      }
    }

    log.info('Item status changed', { itemId, from: prevStatus, to: status })
    this.saveItemToDb(item).catch(() => {
      /* игнорируем ошибку БД */
    })
    this.emitItemStatus(itemId, status, error)

    // Если завершён — переходим к следующему
    if (status === 'completed' || status === 'error' || status === 'cancelled') {
      if (this.currentId === itemId) {
        this.currentId = null
        if (!this.isPaused) {
          this.processNext().catch((err) => log.error('processNext error', { error: String(err) }))
        }
      }
    }
  }

  /**
   * Обновить прогресс item
   *
   * Throttled: отправляет IPC события не чаще 2 раз/сек (500ms интервал)
   * Также очищает завершённые воркеры из detailProgress для экономии памяти
   */
  updateItemProgress(
    itemId: string,
    progress: number,
    currentFileName?: string,
    currentStage?: string,
    detailProgress?: ImportQueueDetailProgress,
  ): void {
    const item = this.queue.get(itemId)
    if (!item) {
      return
    }

    const oldProgress = item.progress ?? 0
    const oldStage = item.currentStage
    const oldFileName = item.currentFileName

    // Всегда обновляем internal state
    item.progress = progress
    if (currentFileName !== undefined) {
      item.currentFileName = currentFileName
    }
    if (currentStage !== undefined) {
      item.currentStage = currentStage
    }

    // Очищаем завершённые воркеры из detailProgress для экономии памяти
    if (detailProgress !== undefined) {
      item.detailProgress = {
        ...detailProgress,
        // Видео воркеры: показываем все (включая завершённые) для наглядности
        videoWorkers: detailProgress.videoWorkers,
        // Аудио воркеры: показываем все (включая завершённые) для наглядности
        audioWorkers: detailProgress.audioWorkers,
      }
    }

    // Throttle IPC событий
    const now = Date.now()
    const lastEmit = this.lastItemProgressEmit.get(itemId) ?? 0

    // Вычисляем сумму прогресса воркеров для отслеживания изменений в detailProgress
    const workersProgressSum = item.detailProgress
      ? (item.detailProgress.videoWorkers?.reduce((sum, w) => sum + w.progress, 0) ?? 0)
        + (item.detailProgress.audioWorkers?.reduce((sum, w) => sum + w.progress, 0) ?? 0)
      : 0
    const lastWorkersSum = this.lastWorkersProgressSum.get(itemId) ?? 0

    // Условия для отправки события:
    // 1. Прошло ITEM_PROGRESS_INTERVAL (250ms)
    // 2. ИЛИ общий прогресс изменился на >= 5%
    // 3. ИЛИ стадия изменилась
    // 4. ИЛИ сумма прогресса воркеров изменилась на >= 1% (плавное обновление GPU воркеров)
    const significantChange = Math.abs(progress - oldProgress) >= 1
    const stageChanged = currentStage !== undefined && currentStage !== oldStage
    const workersChanged = Math.abs(workersProgressSum - lastWorkersSum) >= 1
    const fileNameChanged = currentFileName !== undefined && currentFileName !== oldFileName

    if (
      now - lastEmit >= this.ITEM_PROGRESS_INTERVAL
      || significantChange
      || stageChanged
      || workersChanged
      || fileNameChanged
    ) {
      this.lastItemProgressEmit.set(itemId, now)
      this.lastWorkersProgressSum.set(itemId, workersProgressSum)
      this.emitItemProgress(itemId, progress, currentFileName, currentStage, item.detailProgress)
    }
  }

  /**
   * Обновить только internal state без throttle и IPC emit
   * Используется direct path из main process (parallel-transcode.handlers)
   */
  updateItemProgressInternal(
    itemId: string,
    progress: number,
    currentStage?: string,
    detailProgress?: ImportQueueDetailProgress,
  ): void {
    const item = this.queue.get(itemId)
    if (!item) {
      return
    }

    item.progress = progress
    if (currentStage !== undefined) {
      item.currentStage = currentStage
    }
    if (detailProgress !== undefined) {
      item.detailProgress = {
        ...detailProgress,
        videoWorkers: detailProgress.videoWorkers,
        audioWorkers: detailProgress.audioWorkers,
      }
    }
  }

  /**
   * Эмитить item-progress напрямую в renderer, минуя throttle
   * Используется direct path из main process — гарантирует свежий UI
   */
  emitItemProgressDirect(
    itemId: string,
    progress: number,
    currentFileName?: string,
    currentStage?: string,
    detailProgress?: ImportQueueDetailProgress,
  ): void {
    this.emitItemProgress(itemId, progress, currentFileName, currentStage, detailProgress)
  }

  /**
   * Обновить VMAF прогресс
   */
  updateVmafProgress(itemId: string, vmafProgress: ImportQueueVmafProgress): void {
    const item = this.queue.get(itemId)
    if (!item) {
      return
    }

    item.vmafProgress = vmafProgress
    this.emitItemProgress(itemId, item.progress || 0, item.currentFileName, 'vmaf', undefined, vmafProgress)
  }

  /**
   * Установить результат VMAF
   */
  setVmafResult(itemId: string, result: ImportQueueVmafResult): void {
    const item = this.queue.get(itemId)
    if (!item) {
      return
    }

    item.vmafResult = result

    // Обновляем cqOverride в настройках импорта
    if (item.importSettings) {
      item.importSettings.cqOverride = result.optimalCq
    }

    this.saveItemToDb(item).catch(() => {
      /* игнорируем ошибку БД */
    })
    this.emitStateChanged()
  }

  /**
   * Установить результат импорта (animeId)
   */
  setImportResult(itemId: string, animeId: string): void {
    const item = this.queue.get(itemId)
    if (!item) {
      return
    }

    item.createdAnimeId = animeId
    this.saveItemToDb(item).catch(() => {
      /* игнорируем ошибку БД */
    })
    this.emitStateChanged()
  }

  /**
   * Обновить данные item (профиль, параллельность, sync offset и т.д.)
   * Только для pending items
   */
  updateItem(itemId: string, data: Partial<ImportQueueAddData>): void {
    const item = this.queue.get(itemId)
    if (!item) {
      log.warn('Item not found for update', { itemId })
      return
    }

    // Нельзя редактировать текущий обрабатываемый item
    if (this.currentId === itemId) {
      log.warn('Cannot update currently processing item', { itemId })
      return
    }

    // Нельзя редактировать завершённые items
    if (['completed', 'error', 'cancelled'].includes(item.status)) {
      log.warn('Cannot update completed/error/cancelled item', { itemId })
      return
    }

    // Обновляем поля
    if (data.importSettings) {
      item.importSettings = { ...item.importSettings, ...data.importSettings }
    }
    if (data.syncOffset !== undefined) {
      item.syncOffset = data.syncOffset
    }
    if (data.vmafSettings) {
      item.vmafSettings = { ...item.vmafSettings, ...data.vmafSettings }
    }
    if (data.donorPath !== undefined) {
      item.donorPath = data.donorPath
    }
    if (data.donorFiles) {
      item.donorFiles = data.donorFiles
    }

    log.info('Updated item', { itemId })
    this.emitStateChanged()
  }

  // ==========================================
  // === Внутренняя логика ===
  // ==========================================

  /**
   * Обработать следующий item в очереди
   */
  private async processNext(): Promise<void> {
    if (this.isPaused) {
      log.info('Queue is paused, not processing next')
      return
    }

    // Найти следующий pending item
    const pending = [...this.queue.values()]
      .filter((i) => i.status === 'pending')
      .sort((a, b) => a.priority - b.priority)

    if (pending.length === 0) {
      log.info('No pending items')
      this.currentId = null
      // Разрешаем спящий режим когда очередь пуста
      setPowerSaveTranscoding(false)
      // Нотификация о завершении всей очереди (только если была обработка)
      if (this.hadProcessing) {
        const completed = [...this.queue.values()].filter((i) => i.status === 'completed').length
        const errors = [...this.queue.values()].filter((i) => i.status === 'error').length
        notifyQueueCompleted(completed, errors)
        this.hadProcessing = false
      }
      this.emitStateChanged()
      return
    }

    const next = pending[0]
    this.currentId = next.id
    this.emitStateChanged() // сразу показываем элемент в UI до async операций

    // Прогрев кэшей изображений перед batch-обработкой (один раз при старте)
    if (!this.hadProcessing) {
      await this.prewarmImageCaches()
    }

    // Получаем глобальные настройки и сохраняем в item для renderer
    const globalSettings = await this.getGlobalSettings()
    next.globalUseGpu = globalSettings?.useGpu ?? true
    next.globalAudioBitrate = globalSettings?.audioBitrate ?? 192
    next.globalLibraryPath = globalSettings?.outputPath ?? globalSettings?.libraryPath ?? null

    // Блокируем спящий режим при старте обработки
    setPowerSaveTranscoding(true)

    log.info('Processing next item', {
      id: next.id,
      anime: next.selectedAnime.russian || next.selectedAnime.name,
      globalUseGpu: next.globalUseGpu,
    })

    // Устанавливаем статус vmaf если нужен VMAF, иначе preparing
    const needsVmaf = next.vmafSettings?.enabled && !next.vmafResult

    if (needsVmaf) {
      this.updateItemStatus(next.id, 'vmaf')
      this.emitStateChanged()

      // VMAF → после завершения автоматически вызовет processNext() снова
      // через updateItemStatus('preparing') → runImportInMain()
      this.runVmaf(next.id).catch((err) => {
        log.error('VMAF failed', { itemId: next.id, error: String(err) })
        this.updateItemStatus(next.id, 'error', err instanceof Error ? err.message : String(err))
      })
    } else {
      // Запускаем импорт напрямую в main process (без renderer)
      this.updateItemStatus(next.id, 'preparing')
      this.emitStateChanged()
      this.runImportInMain(next).catch((err) => {
        log.error('Import failed', { itemId: next.id, error: String(err) })
        // Статус уже обновлён в runImportInMain или ImportService
      })
    }
  }

  /**
   * Запуск импорта полностью в main process через ImportService
   * Не зависит от renderer — переживает навигацию, F5, crash renderer
   */
  private async runImportInMain(entry: ImportQueueEntry): Promise<void> {
    const animeName = entry.selectedAnime.russian || entry.selectedAnime.name
    const startedAt = new Date().toISOString()

    try {
      log.info('Запуск импорта в main process', { itemId: entry.id, anime: animeName })

      const result = await this.importService.process(entry)

      if (result.success) {
        // Не перезаписывать статус если импорт был отменён пользователем
        const currentItem = this.queue.get(entry.id)
        if (currentItem?.status === 'cancelled') {
          log.info('Импорт завершился, но уже был отменён — пропускаем', { itemId: entry.id })
          this.saveToHistory(entry, 'cancelled', startedAt, 'Импорт отменён пользователем')
          return
        }
        this.updateItemStatus(entry.id, 'completed', result.warning)
        if (result.animeId) {
          this.setImportResult(entry.id, result.animeId)
        }
        // Уведомляем renderer об инвалидации кэша
        this.broadcastCacheInvalidate()
        // Сохраняем в историю
        this.saveToHistory(entry, 'completed', startedAt, result.warning, result.animeId)

        // Аудит сразу после завершения — пользователь увидит warning без перезапуска
        const completedItem = this.queue.get(entry.id)
        if (completedItem?.createdAnimeId) {
          this.auditSingleItem(completedItem).catch((err) =>
            log.warn('Аудит после завершения не удался', { itemId: entry.id, error: String(err) })
          )
        }
      } else {
        const errorMsg = result.error ?? 'Неизвестная ошибка'
        this.updateItemStatus(entry.id, 'error', errorMsg)
        this.saveToHistory(entry, 'error', startedAt, errorMsg)
      }
    } catch (error) {
      const wasCancelled = this.importService.isCancelled
      if (!wasCancelled) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        this.updateItemStatus(entry.id, 'error', errorMsg)
        this.saveToHistory(entry, 'error', startedAt, errorMsg)
      } else {
        // При отмене статус уже 'cancelled' — не перезаписываем
        this.saveToHistory(entry, 'cancelled', startedAt, 'Импорт отменён пользователем')
      }
    }
  }

  /** Сохранить результат импорта в историю */
  private saveToHistory(
    entry: ImportQueueEntry,
    status: 'completed' | 'error' | 'cancelled',
    startedAt: string,
    errorMessage?: string,
    animeId?: string,
  ): void {
    try {
      const completedAt = new Date().toISOString()
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()

      addHistoryEntry({
        queueItemId: entry.id,
        animeName: entry.selectedAnime.name,
        animeNameRu: entry.selectedAnime.russian ?? undefined,
        animeId: animeId ?? entry.selectedAnime.id,
        shikimoriId: typeof entry.selectedAnime.id === 'string' && entry.selectedAnime.id.match(/^\d+$/)
          ? parseInt(entry.selectedAnime.id)
          : undefined,
        posterUrl: entry.selectedAnime.posterUrl ?? undefined,
        episodesCount: entry.files.filter((f) => f.selected).length,
        seasonNumber: entry.parsedInfo.seasonNumber ?? undefined,
        status,
        errorMessage,
        startedAt,
        completedAt,
        durationMs,
        vmafScore: entry.vmafResult?.vmafScore ?? undefined,
        cqValue: entry.importSettings.cqOverride ?? entry.vmafResult?.optimalCq ?? undefined,
        usedCpuFallback: entry.vmafResult?.useCpuFallback ?? undefined,
        profileId: entry.importSettings.profileId ?? undefined,
        sourceFolderPath: entry.folderPath,
      })
    } catch (err) {
      log.warn('Не удалось сохранить в историю', { error: String(err) })
    }
  }

  /**
   * Отправить IPC event для инвалидации TanStack Query кэша в renderer
   */
  private broadcastCacheInvalidate(): void {
    const queryKeys = ['Anime', 'Episode', 'Season', 'File', 'AnimeRelation', 'Franchise']
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('import-queue:cache-invalidate', queryKeys)
      }
    }
  }

  /**
   * Прогрев кэшей изображений перед batch-обработкой
   * Загружает все известные URL→CID маппинги из БД в in-memory кэш image-uploader,
   * чтобы не перекачивать уже загруженные в IPFS изображения
   */
  private async prewarmImageCaches(): Promise<void> {
    try {
      const [studios, persons, characters] = await Promise.all([
        prisma.shikimoriStudio.findMany({
          where: { imageCid: { not: null }, imageUrl: { not: null } },
          select: { imageUrl: true, imageCid: true },
        }),
        prisma.shikimoriPerson.findMany({
          where: { imageCid: { not: null }, imageUrl: { not: null } },
          select: { imageUrl: true, imageCid: true },
        }),
        prisma.shikimoriCharacter.findMany({
          where: { imageCid: { not: null }, imageUrl: { not: null } },
          select: { imageUrl: true, imageCid: true },
        }),
      ])

      const entries = [
        ...studios.map((s) => ({ url: s.imageUrl!, cid: s.imageCid! })),
        ...persons.map((p) => ({ url: p.imageUrl!, cid: p.imageCid! })),
        ...characters.map((c) => ({ url: c.imageUrl!, cid: c.imageCid! })),
      ]

      if (entries.length > 0) {
        prewarmCache(entries)
        log.info('Кэш изображений прогрет перед batch', {
          studios: studios.length,
          persons: persons.length,
          characters: characters.length,
          total: entries.length,
        })
      }
    } catch (err) {
      log.warn('Не удалось прогреть кэш изображений', { error: String(err) })
    }
  }

  /**
   * Получить глобальные настройки приложения
   */
  private async getGlobalSettings(): Promise<
    {
      useGpu: boolean
      audioBitrate: number
      libraryPath: string | null
      outputPath: string | null
    } | null
  > {
    try {
      const settings = await prisma.settings.findFirst()
      log.info('Global settings loaded', {
        useGpu: settings?.useGpu,
        audioBitrate: settings?.audioBitrate,
        libraryPath: settings?.libraryPath,
        hasSettings: !!settings,
      })
      return settings
        ? {
          useGpu: settings.useGpu,
          audioBitrate: settings.audioBitrate,
          libraryPath: settings.libraryPath,
          outputPath: settings.outputPath,
        }
        : null
    } catch (err) {
      log.warn('Failed to get global settings', { error: String(err) })
      return null
    }
  }

  /**
   * Запустить VMAF подбор CQ для item
   */
  private async runVmaf(itemId: string): Promise<void> {
    const item = this.queue.get(itemId)
    if (!item) {
      throw new Error(`Item ${itemId} not found`)
    }

    if (!item.vmafSettings?.enabled) {
      throw new Error('VMAF not enabled for this item')
    }

    // Получаем первый выбранный файл
    const selectedFiles = item.files.filter((f) => f.selected)
    if (selectedFiles.length === 0) {
      throw new Error('No selected files for VMAF')
    }
    const sampleFile = selectedFiles[0]

    // Получаем профиль кодирования
    const profile = item.encodingProfile
    if (!profile) {
      throw new Error('Encoding profile not found')
    }

    // Получаем глобальные настройки для проверки useGpu
    const globalSettings = await this.getGlobalSettings()

    // Определяем режим кодирования:
    // 1. profile.preferCpu — принудительно CPU в профиле
    // 2. !profile.useGpu — GPU отключен в профиле
    // 3. globalSettings?.useGpu === false — GPU отключен глобально
    const shouldUseCpu = profile.preferCpu || !profile.useGpu || globalSettings?.useGpu === false

    const animeName = item.selectedAnime.russian || item.selectedAnime.name
    const encodingMode = shouldUseCpu ? 'CPU' : 'GPU'
    log.info('Starting VMAF', {
      animeName,
      targetVmaf: item.vmafSettings.targetVmaf,
      encoding: encodingMode,
      reason: profile.preferCpu
        ? 'preferCpu'
        : !profile.useGpu
        ? 'profile.useGpu=false'
        : globalSettings?.useGpu === false
        ? 'settings.useGpu=false'
        : 'GPU enabled',
    })

    // Формируем videoOptions из профиля
    // ВАЖНО: если глобально GPU отключен, переопределяем useGpu в опциях
    const videoOptions = {
      codec: profile.codec.toLowerCase() as 'av1' | 'hevc' | 'h264',
      useGpu: !shouldUseCpu, // Учитываем глобальную настройку
      preset: profile.preset,
      rateControl: profile.rateControl as 'CONSTQP' | 'VBR',
      maxBitrate: profile.maxBitrate ?? undefined,
      tune: profile.tune as 'HQ' | 'UHQ' | 'ULL' | 'LL' | undefined,
      multipass: profile.multipass as 'DISABLED' | 'QRES' | 'FULLRES' | undefined,
      spatialAq: profile.spatialAq,
      temporalAq: profile.temporalAq,
      aqStrength: profile.aqStrength ?? undefined,
      lookahead: profile.lookahead ?? undefined,
      lookaheadLevel: profile.lookaheadLevel ?? undefined,
      gopSize: profile.gopSize ?? undefined,
      bRefMode: profile.bRefMode as 'DISABLED' | 'EACH' | 'MIDDLE' | undefined,
      bFrames: profile.bFrames ?? undefined,
    }

    // Anime4K VMAF: строим фильтр для упскейла сэмплов (480p → 1080p lossless эталон)
    let anime4kFilter: string | undefined
    if (item.importSettings.anime4kEnabled && isAnime4KAvailable()) {
      const shaderPath = getAnime4KShaderPath()
      anime4kFilter = await buildAnime4KFilter(sampleFile.path, shaderPath, item.importSettings.denoiseEnabled)
      log.info('Anime4K VMAF filter built', { animeName, filter: anime4kFilter })
    }

    // Опции VMAF поиска
    const vmafOptions = {
      targetVmaf: item.vmafSettings.targetVmaf,
      tolerance: 0.5,
      maxIterations: 10,
      ...(item.skipCompressionCheck && { skipCompressionCheck: true }),
      ...(anime4kFilter && { anime4kFilter }),
    }

    // Запускаем VMAF поиск (preferCpu если нужно использовать CPU)
    const result = await findOptimalCQ(
      sampleFile.path,
      videoOptions,
      vmafOptions,
      (progress: CqSearchProgress) => {
        // Обновляем прогресс item
        const vmafProgress: ImportQueueVmafProgress = {
          ...progress,
          lastVmaf: progress.lastVmaf,
        }
        this.updateVmafProgress(itemId, vmafProgress)
      },
      shouldUseCpu,
    )

    log.info('VMAF completed', {
      animeName,
      optimalCq: result.optimalCq,
      vmaf: result.vmafScore,
      timeMs: result.totalTime,
    })

    // Сохраняем результат
    const vmafResult: ImportQueueVmafResult = {
      optimalCq: result.optimalCq,
      vmafScore: result.vmafScore,
      iterations: result.iterations,
      totalTime: result.totalTime,
      useCpuFallback: result.useCpuFallback,
    }
    this.setVmafResult(itemId, vmafResult)

    // Сбрасываем флаг после успешного VMAF — следующий retry снова проверит сжатие
    const itemAfterVmaf = this.queue.get(itemId)
    if (itemAfterVmaf) {
      itemAfterVmaf.skipCompressionCheck = undefined
    }

    // Запускаем импорт напрямую в main (без ожидания renderer)
    const updatedItem = this.queue.get(itemId)
    if (updatedItem) {
      this.updateItemStatus(itemId, 'preparing')
      this.runImportInMain(updatedItem).catch((err) => {
        log.error('Import after VMAF failed', { itemId, error: String(err) })
      })
    }
  }

  // ==========================================
  // === Отправка событий ===
  // ==========================================

  /**
   * Отправить событие всем окнам
   */
  private emit2Windows(event: string, ...args: unknown[]): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(event, ...args)
      }
    }
  }

  /**
   * Отправить полное состояние
   */
  private emitStateChanged(): void {
    this.emit2Windows('import-queue:state-changed', this.getState())
  }

  /**
   * Отправить изменение статуса item
   */
  private emitItemStatus(itemId: string, status: ImportQueueStatus, error?: string): void {
    this.emit2Windows('import-queue:item-status', { itemId, status, error })
  }

  /**
   * Отправить изменение прогресса item
   */
  private emitItemProgress(
    itemId: string,
    progress: number,
    currentFileName?: string,
    currentStage?: string,
    detailProgress?: ImportQueueDetailProgress,
    vmafProgress?: ImportQueueVmafProgress,
  ): void {
    this.emit2Windows('import-queue:item-progress', {
      itemId,
      progress,
      currentFileName,
      currentStage,
      detailProgress,
      vmafProgress,
    })
  }

  // ==========================================
  // === Персистентность (SQLite) ===
  // ==========================================

  /**
   * Загрузить незавершённые items из БД при старте приложения
   */
  private async loadFromDb(): Promise<void> {
    try {
      // Загружаем ВСЕ items — completed/error/cancelled тоже восстанавливаем
      const dbItems = await prisma.importQueueItem.findMany({
        orderBy: { priority: 'asc' },
      })

      if (dbItems.length === 0) {
        return
      }

      for (const dbItem of dbItems) {
        try {
          const entry = JSON.parse(dbItem.dataJson) as ImportQueueEntry
          entry.id = dbItem.id
          entry.priority = dbItem.priority

          // Столбец status в БД (Prisma enum UPPERCASE) имеет приоритет над dataJson.status (lowercase)
          const dbStatus = dbItem.status?.toLowerCase() as ImportQueueStatus
          if (dbStatus && dbStatus !== entry.status) {
            entry.status = dbStatus
          }
          if (dbItem.error && !entry.error) {
            entry.error = dbItem.error
          }
          // Восстанавливаем createdAnimeId из столбца БД (для старых записей без поля в dataJson)
          if (dbItem.createdAnimeId && !entry.createdAnimeId) {
            entry.createdAnimeId = dbItem.createdAnimeId
          }

          // Сбрасываем АКТИВНЫЕ статусы — процесс прервался при перезапуске
          const activeStatuses: ImportQueueStatus[] = ['vmaf', 'preparing', 'transcoding', 'postprocess']
          if (activeStatuses.includes(entry.status)) {
            entry.status = 'pending'
            entry.progress = undefined
            entry.currentFileName = undefined
            entry.currentStage = undefined
            entry.detailProgress = undefined
          }
          // completed/error/cancelled — оставляем как есть
          // vmafResult сохраняем — не нужно повторно подбирать CQ

          this.queue.set(dbItem.id, entry)
          this.priorityCounter = Math.max(this.priorityCounter, dbItem.priority + 1)
        } catch {
          log.warn('Не удалось восстановить item из БД', { id: dbItem.id })
        }
      }

      log.info('Загружено из БД', { count: this.queue.size })

      // Аудит завершённых items — найти неполные эпизоды
      const completedItems = [...this.queue.values()].filter((item) => item.status === 'completed')
      const completedWithAnime = completedItems.filter((item) => item.createdAnimeId)
      log.info('Аудит: старт', {
        completed: completedItems.length,
        withAnimeId: completedWithAnime.length,
      })
      if (completedWithAnime.length > 0) {
        this.auditCompletedItems().catch((err) =>
          log.warn('Аудит completed items при загрузке не удался', { error: String(err) })
        )
      }
    } catch (error) {
      log.error('Ошибка загрузки очереди из БД', { error: String(error) })
    }
  }

  /**
   * Сохранить item в БД (upsert)
   */
  private async saveItemToDb(entry: ImportQueueEntry): Promise<void> {
    try {
      // Сериализуем без transient полей (progress, detailProgress)
      const {
        progress: _p,
        currentFileName: _cf,
        currentStage: _cs,
        detailProgress: _dp,
        vmafProgress: _vp,
        ...persistData
      } = entry

      await prisma.importQueueItem.upsert({
        where: { id: entry.id },
        create: {
          id: entry.id,
          status: this.mapStatusToDb(entry.status),
          priority: entry.priority,
          addedAt: new Date(entry.addedAt),
          startedAt: entry.startedAt ? new Date(entry.startedAt) : null,
          completedAt: entry.completedAt ? new Date(entry.completedAt) : null,
          dataJson: JSON.stringify(persistData),
          error: entry.error ?? null,
          progress: 0,
          currentFileName: null,
          createdAnimeId: entry.createdAnimeId ?? null,
        },
        update: {
          status: this.mapStatusToDb(entry.status),
          priority: entry.priority,
          startedAt: entry.startedAt ? new Date(entry.startedAt) : null,
          completedAt: entry.completedAt ? new Date(entry.completedAt) : null,
          dataJson: JSON.stringify(persistData),
          error: entry.error ?? null,
          createdAnimeId: entry.createdAnimeId ?? null,
        },
      })
    } catch (error) {
      log.error('Ошибка сохранения item в БД', { id: entry.id, error: String(error) })
    }
  }

  /**
   * Удалить item из БД
   */
  private async deleteItemFromDb(itemId: string): Promise<void> {
    try {
      await prisma.importQueueItem.delete({ where: { id: itemId } }).catch(() => {
        /* может не существовать */
      })
    } catch {
      /* игнорируем */
    }
  }

  /**
   * Маппинг статуса в enum БД
   */
  private mapStatusToDb(
    status: ImportQueueStatus,
  ): 'PENDING' | 'VMAF' | 'PREPARING' | 'TRANSCODING' | 'POSTPROCESS' | 'COMPLETED' | 'ERROR' | 'CANCELLED' {
    const map: Record<
      ImportQueueStatus,
      'PENDING' | 'VMAF' | 'PREPARING' | 'TRANSCODING' | 'POSTPROCESS' | 'COMPLETED' | 'ERROR' | 'CANCELLED'
    > = {
      pending: 'PENDING',
      vmaf: 'VMAF',
      preparing: 'PREPARING',
      transcoding: 'TRANSCODING',
      postprocess: 'POSTPROCESS',
      completed: 'COMPLETED',
      error: 'ERROR',
      cancelled: 'CANCELLED',
    }
    return map[status]
  }

  // ==========================================
  // === Очистка ===
  // ==========================================

  /**
   * Очистить завершённые items
   *
   * @param options.onlySuccess — если true, удаляются только успешно завершённые
   *                              (status === 'completed'), а error/cancelled остаются.
   *                              По умолчанию (false) удаляются все: completed + error + cancelled.
   */
  clearCompleted(options?: { onlySuccess?: boolean }): void {
    const onlySuccess = options?.onlySuccess === true
    const toRemove: string[] = []
    for (const [id, item] of this.queue) {
      if (onlySuccess) {
        if (item.status === 'completed') {
          toRemove.push(id)
        }
      } else if (item.status === 'completed' || item.status === 'error' || item.status === 'cancelled') {
        toRemove.push(id)
      }
    }

    for (const id of toRemove) {
      this.queue.delete(id)
      this.lastItemProgressEmit.delete(id) // Очистка throttle Map
      this.deleteItemFromDb(id).catch(() => {
        /* игнорируем ошибку БД */
      })
    }

    if (toRemove.length > 0) {
      log.info('Cleared completed items', { count: toRemove.length, onlySuccess })
      this.emitStateChanged()
    }
  }

  /**
   * Полная очистка
   */
  clearAll(): void {
    if (this.currentId) {
      log.warn('Cannot clear while processing')
      return
    }

    // Удаляем все items из БД
    const ids = [...this.queue.keys()]
    for (const id of ids) {
      this.deleteItemFromDb(id).catch(() => {
        /* игнорируем ошибку БД */
      })
    }

    this.queue.clear()
    this.lastItemProgressEmit.clear() // Очистка throttle Map
    this.currentId = null
    this.priorityCounter = 0
    this.emitStateChanged()
  }
}
