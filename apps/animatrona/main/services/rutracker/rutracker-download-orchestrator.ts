/**
 * Оркестратор скачивания из Рутрекера (Фаза 5)
 *
 * Связывает: парсинг + матчинг → торрент → ImportQueue
 *
 * Флоу:
 * 1. Пользователь подтверждает превью (RutrackerImportResult + ShikimoriData)
 * 2. Оркестратор запускает скачивание торрента по магнет-ссылке
 * 3. По завершении скачивания → формирует ImportQueueAddData из файлов
 * 4. Добавляет в ImportQueue для транскодирования
 *
 * Renderer подписывается на события торрента для отображения прогресса.
 */

import { app } from 'electron'
import path from 'path'

import type {
  ImportQueueAddData,
  ImportQueueFile,
  ImportQueueParsedInfo,
  ImportQueueSelectedAnime,
} from '../../../shared/types/import-queue'
import { createModuleLogger } from '../../utils/logger'
import type { ShikimoriAnimeExtended } from '../shikimori'
import type { TorrentInfo } from '../torrent'
import { getTorrentService, initTorrentService } from '../torrent'
import type { RutrackerImportResult } from './rutracker-import'

const log = createModuleLogger('RutrackerOrchestrator')

/** Расширения видеофайлов */
const VIDEO_EXTENSIONS = new Set(['.mkv', '.mp4', '.avi', '.webm', '.ts', '.m2ts'])

/** Данные для запуска скачивания */
export interface StartDownloadParams {
  /** Результат парсинга и матчинга */
  importResult: RutrackerImportResult
  /** Данные Shikimori (уже подтверждённые) */
  shikimoriData: ShikimoriAnimeExtended
  /** Папка для скачивания (если не указана — по умолчанию) */
  downloadPath?: string
  /** ID профиля кодирования */
  profileId?: string
  /** Последовательная загрузка */
  sequential?: boolean
  /** Раздача содержит несколько отдельных аниме */
  isBundle?: boolean
  /** JSON с данными аниме в наборе [{shikimoriId, animeName}] */
  bundleAnimesJson?: string
}

/** Результат запуска скачивания */
export interface StartDownloadResult {
  /** InfoHash торрента */
  infoHash: string
  /** Информация о торренте */
  torrent: TorrentInfo
}

/** Активная загрузка — метаданные для создания ImportQueue item */
interface ActiveDownload {
  params: StartDownloadParams
  infoHash: string
}

/** Метаданные загрузки для renderer (кнопка «В очередь») */
export interface DownloadMeta {
  shikimoriId?: number
  animeName: string
  folderPath: string
  rutrackerUrl?: string
}

/**
 * Оркестратор: Rutracker → Torrent → ImportQueue
 */
class RutrackerDownloadOrchestrator {
  private static instance: RutrackerDownloadOrchestrator | null = null

  /** Активные загрузки: infoHash → метаданные */
  private downloads = new Map<string, ActiveDownload>()

  /** Подписка на события торрент-сервиса */
  private unsubscribeDone: (() => void) | null = null

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- синглтон
  private constructor() {}

  static getInstance(): RutrackerDownloadOrchestrator {
    if (!RutrackerDownloadOrchestrator.instance) {
      RutrackerDownloadOrchestrator.instance = new RutrackerDownloadOrchestrator()
    }
    return RutrackerDownloadOrchestrator.instance
  }

  /**
   * Запустить скачивание торрента
   *
   * После завершения автоматически добавит файлы в ImportQueue.
   */
  async startDownload(params: StartDownloadParams): Promise<StartDownloadResult> {
    const { importResult, downloadPath } = params
    const magnetLink = importResult.torrent.magnetLink

    if (!magnetLink) {
      throw new Error('Магнет-ссылка отсутствует в данных раздачи')
    }

    const targetPath = downloadPath || this.getDefaultDownloadPath()

    log.info('Запуск скачивания', {
      name: importResult.torrent.nameRu,
      magnetLink: magnetLink.substring(0, 60) + '...',
      targetPath,
      isBundle: params.isBundle,
      bundleAnimesJsonLength: params.bundleAnimesJson?.length ?? 0,
    })

    // initTorrentService() подключает qBittorrent бэкенд по настройкам из Settings
    const torrentService = await initTorrentService()

    // Подписываемся на завершение (один раз)
    this.ensureDoneListener()

    const torrent = await torrentService.add(magnetLink, {
      downloadPath: targetPath,
      sequential: params.sequential,
      isBundle: params.isBundle,
      bundleAnimesJson: params.bundleAnimesJson,
    })

    // Сохраняем метаданные загрузки
    this.downloads.set(torrent.infoHash, {
      params,
      infoHash: torrent.infoHash,
    })

    // Сохраняем shikimoriId, animeName и rutrackerUrl в TorrentService для persist
    torrentService.updateMeta(torrent.infoHash, {
      shikimoriId: Number(params.shikimoriData.id),
      animeName: params.shikimoriData.russian ?? params.shikimoriData.name,
      rutrackerUrl: importResult.torrent.url || undefined,
    })

    log.info('Торрент добавлен', {
      infoHash: torrent.infoHash,
      name: torrent.name,
      totalSize: torrent.totalSize,
    })

    return {
      infoHash: torrent.infoHash,
      torrent,
    }
  }

  /**
   * Получить список активных загрузок
   */
  getActiveDownloads(): Array<{ infoHash: string; name: string }> {
    const torrentService = getTorrentService()
    return Array.from(this.downloads.values()).map((d) => {
      const torrent = torrentService.get(d.infoHash)
      return {
        infoHash: d.infoHash,
        name: torrent?.name ?? d.params.importResult.torrent.nameRu,
      }
    })
  }

  /**
   * Получить метаданные загрузки для renderer (кнопка «В очередь»)
   *
   * Сначала ищет в памяти (downloads Map), затем в persist (TorrentService meta).
   */
  getDownloadMeta(infoHash: string): DownloadMeta | null {
    const torrentService = getTorrentService()
    const torrent = torrentService.get(infoHash)
    if (!torrent) {
      return null
    }

    const torrentPath = torrent.path ?? ''
    const torrentName = torrent.name ?? ''
    const folderPath = path.join(torrentPath, torrentName)

    // Из памяти оркестратора (текущая сессия)
    const download = this.downloads.get(infoHash)
    if (download) {
      return {
        shikimoriId: Number(download.params.shikimoriData.id),
        animeName: download.params.shikimoriData.russian ?? download.params.shikimoriData.name,
        folderPath,
        rutrackerUrl: download.params.importResult.torrent.url || undefined,
      }
    }

    // Из DB persist (после перезапуска) — возвращаем даже без shikimoriId
    const savedMeta = torrentService.getShikimoriMeta(infoHash)
    return {
      shikimoriId: savedMeta?.shikimoriId,
      animeName: savedMeta?.animeName ?? torrentName,
      folderPath,
      rutrackerUrl: savedMeta?.rutrackerUrl,
    }
  }

  /**
   * Отменить загрузку
   */
  async cancelDownload(infoHash: string, deleteFiles = true): Promise<boolean> {
    const download = this.downloads.get(infoHash)
    if (!download) {
      return false
    }

    await getTorrentService().remove(infoHash, deleteFiles)
    this.downloads.delete(infoHash)

    log.info('Загрузка отменена', { infoHash })
    return true
  }

  /**
   * Подписка на событие 'done' торрент-сервиса
   */
  private ensureDoneListener(): void {
    if (this.unsubscribeDone) {
      return
    }

    const torrentService = getTorrentService()
    const handler = (info: TorrentInfo) => this.onTorrentDone(info)

    torrentService.on('torrent:done', handler)
    this.unsubscribeDone = () => torrentService.off('torrent:done', handler)

    // Торрент-сервис рассылает 'torrent:done' через BrowserWindow,
    // но нам нужен EventEmitter в main process, поэтому подписываемся напрямую
  }

  /**
   * Обработка завершения скачивания торрента
   *
   * НЕ добавляем автоматически в очередь — пользователь сам нажмёт
   * «В очередь» и настроит импорт через ImportWizardDialog.
   */
  private async onTorrentDone(info: TorrentInfo): Promise<void> {
    const download = this.downloads.get(info.infoHash)
    if (!download) {
      return
    } // Не наш торрент

    log.info('Скачивание завершено, готово к импорту через кнопку «В очередь»', {
      infoHash: info.infoHash,
      name: info.name,
      files: info.files.length,
    })
  }

  /**
   * Сформировать ImportQueueAddData из скачанных файлов торрента
   */
  private buildImportQueueData(torrentInfo: TorrentInfo, download: ActiveDownload): ImportQueueAddData {
    const { params } = download
    const { importResult, shikimoriData, profileId } = params
    const torrent = importResult.torrent

    // Папка с файлами торрента
    const folderPath = path.join(torrentInfo.path, torrentInfo.name)

    // Фильтруем видеофайлы
    const videoFiles = torrentInfo.files.filter((f) => {
      const ext = path.extname(f.name).toLowerCase()
      return VIDEO_EXTENSIONS.has(ext)
    })

    // Формируем список файлов для ImportQueue
    const files: ImportQueueFile[] = videoFiles.map((f, index) => ({
      path: path.join(torrentInfo.path, f.path),
      name: f.name,
      episodeNumber: this.extractEpisodeNumber(f.name, index + 1),
      selected: true,
    }))

    // Parsed info из данных парсера
    const parsedInfo: ImportQueueParsedInfo = {
      animeName: torrent.nameOriginal || torrent.nameRu,
      seasonNumber: null,
      subGroup: torrent.releaseGroup ?? null,
      quality: torrent.resolution ?? null,
      original: torrent.nameRu,
      source: 'folder',
      isBdRemux: torrent.sourceType?.toLowerCase().includes('remux'),
      rutrackerUrl: torrent.url || undefined,
    }

    // Данные Shikimori
    const selectedAnime: ImportQueueSelectedAnime = {
      id: String(shikimoriData.id),
      name: shikimoriData.name,
      russian: shikimoriData.russian ?? null,
      description: shikimoriData.description ?? null,
      descriptionHtml: shikimoriData.descriptionHtml ?? null,
      posterUrl: shikimoriData.poster?.originalUrl ?? null,
      kind: shikimoriData.kind ?? null,
      status: shikimoriData.status ?? null,
      episodes: shikimoriData.episodes ?? 0,
      episodesAired: shikimoriData.episodesAired ?? 0,
      airedOn: shikimoriData.airedOn?.date ?? null,
      score: shikimoriData.score ? parseFloat(shikimoriData.score) : null,
      genres: (shikimoriData.genres ?? []).map((g) => ({
        id: String(g.id),
        name: g.name,
        russian: g.russian,
        kind: g.kind,
      })),
    }

    return {
      folderPath,
      parsedInfo,
      selectedAnime,
      files,
      importSettings: {
        profileId: profileId ?? null,
        audioMaxConcurrent: 2,
        videoMaxConcurrent: 1,
      },
    }
  }

  /**
   * Извлечь номер эпизода из имени файла
   */
  private extractEpisodeNumber(filename: string, fallback: number): number {
    // Паттерны: [01], E01, - 01, _01_, S01E01
    const patterns = [
      /[Ss]\d+[Ee](\d+)/, // S01E01
      /(?:^|[\s_\-[])(?:E|EP|ep|Episode\s*)(\d+)/i, // E01, EP01
      /\s-\s(\d+)/, // - 01
      /\[(\d{2,3})\]/, // [01]
      /(?:^|[_\s])(\d{2,3})(?:[_\s]|$)/, // _01_
    ]

    for (const pattern of patterns) {
      const match = filename.match(pattern)
      if (match) {
        return parseInt(match[1], 10)
      }
    }

    return fallback
  }

  /**
   * Путь по умолчанию для скачивания торрентов
   */
  private getDefaultDownloadPath(): string {
    return path.join(app.getPath('downloads'), 'Animatrona')
  }
}

/** Получить экземпляр оркестратора */
export function getDownloadOrchestrator(): RutrackerDownloadOrchestrator {
  return RutrackerDownloadOrchestrator.getInstance()
}
