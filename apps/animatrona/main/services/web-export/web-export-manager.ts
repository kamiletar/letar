/**
 * WebExportManager — координатор экспорта для Web Player
 *
 * Управляет процессом:
 * 1. Сборка ресурсов (asset bundler)
 * 2. Генерация манифеста
 * 3. Опциональная публикация в IPFS
 */

import { EventEmitter } from 'events'
import * as fs from 'fs/promises'
import * as path from 'path'

import type { QueueExportConfig } from '../../../shared/types/export-queue'
import type {
  WebExportOptions,
  WebExportProgress,
  WebExportResult,
  WebPlayerManifest,
} from '../../../shared/types/web-player'
import { createModuleLogger } from '../../utils/logger'

import { getIpfsUrl } from '../../utils/ipfs-url'
import { buildDirectoryStructure, bundleAssets } from './asset-bundler'
import { generateManifest } from './manifest-generator'

const log = createModuleLogger('WebExportManager')

/**
 * Singleton сервис экспорта Web Player
 */
export class WebExportManager extends EventEmitter {
  private static instance: WebExportManager | null = null
  private isExporting = false
  private cancelled = false

  private constructor() {
    super()
  }

  static getInstance(): WebExportManager {
    if (!WebExportManager.instance) {
      WebExportManager.instance = new WebExportManager()
    }
    return WebExportManager.instance
  }

  /**
   * Проверяет, идёт ли экспорт
   */
  isRunning(): boolean {
    return this.isExporting
  }

  /**
   * Отменяет текущий экспорт
   */
  cancel(): void {
    this.cancelled = true
  }

  /**
   * Запускает экспорт для Web Player
   *
   * Режимы:
   * - embedded: скачивает файлы на диск, создаёт локальную структуру
   * - referenced: создаёт локальную структуру с CID в manifest, публикует в IPFS
   * - publish: создаёт виртуальную IPFS директорию БЕЗ скачивания файлов (оптимизированный режим)
   */
  async startExport(config: QueueExportConfig, options: WebExportOptions): Promise<WebExportResult> {
    if (this.isExporting) {
      return { success: false, error: 'Export already in progress' }
    }

    this.isExporting = true
    this.cancelled = false

    const emitProgress = (progress: WebExportProgress) => {
      this.emit('progress', progress)
    }

    try {
      // Режим publish — оптимизированный путь через виртуальные директории
      if (options.mode === 'publish') {
        return await this.publishVirtual(config, options, emitProgress)
      }

      // Режимы embedded и referenced — стандартный путь со скачиванием
      // Создаём директорию экспорта
      const outputDir = path.join(options.outputDir, this.sanitizeFolderName(config.animeName))
      await fs.mkdir(outputDir, { recursive: true })

      emitProgress({
        stage: 'preparing',
        percent: 0,
        message: 'Подготовка экспорта...',
      })

      if (this.cancelled) {
        return { success: false, error: 'Cancelled' }
      }

      // 1. Собираем ресурсы (скачиваем из IPFS на диск)
      await bundleAssets(config, outputDir, options.mode, options.episodes, emitProgress)

      if (this.cancelled) {
        return { success: false, error: 'Cancelled' }
      }

      // 2. Генерируем манифест
      emitProgress({
        stage: 'generating-manifest',
        percent: 85,
        message: 'Генерация манифеста...',
      })

      const manifest: WebPlayerManifest = generateManifest({
        config,
        mode: options.mode,
        selectedEpisodes: options.episodes,
        defaultAudioKey: options.defaults.audio,
        defaultSubtitleKey: options.defaults.subtitle,
      })

      await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

      if (this.cancelled) {
        return { success: false, error: 'Cancelled' }
      }

      // 3. Публикуем в IPFS (только для режима referenced)
      let rootCid: string | undefined
      let gatewayUrl: string | undefined

      if (options.mode === 'referenced') {
        emitProgress({
          stage: 'publishing',
          percent: 90,
          message: 'Публикация в IPFS...',
        })

        try {
          rootCid = await this.publishToIpfs(outputDir)
          gatewayUrl = getIpfsUrl(rootCid)!
        } catch (error) {
          log.warn('Ошибка публикации в IPFS', {
            error: error instanceof Error ? error.message : String(error),
          })
          // Для referenced режима — не фейлим, файлы уже созданы
        }
      }

      emitProgress({
        stage: 'done',
        percent: 100,
        message: 'Экспорт завершён!',
      })

      return {
        success: true,
        outputPath: outputDir,
        rootCid,
        gatewayUrl,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      log.error('Ошибка экспорта', {
        error: errorMsg,
      })

      return {
        success: false,
        error: errorMsg,
      }
    } finally {
      this.isExporting = false
      this.cancelled = false
    }
  }

  /**
   * Публикует в IPFS через виртуальную директорию (режим publish)
   *
   * Оптимизированный путь:
   * - НЕ скачивает файлы из IPFS на диск
   * - Строит виртуальную директорию из существующих CID
   * - Мгновенная публикация без I/O на диск
   */
  private async publishVirtual(
    config: QueueExportConfig,
    options: WebExportOptions,
    emitProgress: (progress: WebExportProgress) => void,
  ): Promise<WebExportResult> {
    emitProgress({
      stage: 'preparing',
      percent: 10,
      message: 'Генерация манифеста...',
    })

    // 1. Генерируем манифест (режим referenced — CID в путях)
    const manifest: WebPlayerManifest = generateManifest({
      config,
      mode: 'referenced', // В режиме publish используем CID в manifest
      selectedEpisodes: options.episodes,
      defaultAudioKey: options.defaults.audio,
      defaultSubtitleKey: options.defaults.subtitle,
    })

    if (this.cancelled) {
      return { success: false, error: 'Cancelled' }
    }

    emitProgress({
      stage: 'publishing',
      percent: 30,
      message: 'Создание виртуальной IPFS директории...',
    })

    // 2. Строим структуру DirEntry из CID (включая JASSUB для субтитров)
    const structure = await buildDirectoryStructure(config, options.episodes, manifest)

    if (this.cancelled) {
      return { success: false, error: 'Cancelled' }
    }

    emitProgress({
      stage: 'publishing',
      percent: 50,
      message: 'Публикация в IPFS...',
    })

    // 3. Создаём виртуальную директорию в IPFS
    const { createDirectoryFromCids } = await import('../ipfs/unixfs-service')
    const rootCid = await createDirectoryFromCids(structure)
    const gatewayUrl = getIpfsUrl(rootCid)!

    emitProgress({
      stage: 'done',
      percent: 100,
      message: 'Опубликовано в IPFS!',
    })

    return {
      success: true,
      // В режиме publish локальная папка НЕ создаётся
      outputPath: undefined,
      rootCid,
      gatewayUrl,
    }
  }

  /**
   * Публикует директорию в IPFS
   */
  private async publishToIpfs(dirPath: string): Promise<string> {
    // Динамический импорт для избежания циклических зависимостей
    const { UnixFSService } = await import('../ipfs/unixfs-service')
    const unixfs = UnixFSService.getInstance()

    // Добавляем директорию в IPFS
    const cid = await unixfs.addDirectory(dirPath)
    return cid.toString()
  }

  /**
   * Очищает имя папки от недопустимых символов
   */
  private sanitizeFolderName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
  }
}
