/**
 * IPC handlers для информации о приложении
 */

import { app, type BrowserWindow, Notification, powerSaveBlocker, shell } from 'electron'
import * as fs from 'fs'
import * as os from 'os'
import path from 'path'
import { getKuboService } from '../services/kubo'
import { runLibraryMigration } from '../services/library/library-migration'
import { CacheManager } from '../utils/cache-manager'
import { prisma } from '../utils/db'
import { createHandler } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('AppHandlers')

/** Флаг первого запуска — нужен setup wizard */
let _needsSetup = false

/** Ссылка на главное окно для отправки прогресса миграции */
let _mainWindowRef: BrowserWindow | null = null

/** Устанавливается из main.ts при первом запуске без libraryPath */
export function setNeedsSetup(value: boolean): void {
  _needsSetup = value
}

/** Устанавливается из main.ts после создания главного окна */
export function setMainWindowForMigration(win: BrowserWindow): void {
  _mainWindowRef = win
}

/** Параметры системного уведомления */
export interface NotificationOptions {
  title: string
  body: string
  /** Тип уведомления (влияет на иконку/звук) */
  type?: 'info' | 'success' | 'error'
}

/** Состояние блокировки сна */
interface PowerSaveState {
  blockerId: number | null
  autoEnabled: boolean
  manualEnabled: boolean
  isTranscoding: boolean
  isPlaybackActive: boolean
}

/** Глобальное состояние блокировки сна */
const powerSaveState: PowerSaveState = {
  blockerId: null,
  autoEnabled: true,
  manualEnabled: false,
  isTranscoding: false,
  isPlaybackActive: false,
}

/** Информация о диске */
export interface DiskInfo {
  total: number
  free: number
  used: number
  usedPercent: number
}

/** TTL кеша размера библиотеки (5 минут) */
const LIBRARY_SIZE_CACHE_TTL = 5 * 60 * 1000

/** Кеш размера библиотеки с автоматическим TTL */
const librarySizeCache = new CacheManager<number>(LIBRARY_SIZE_CACHE_TTL)

/**
 * Получает информацию о диске для указанного пути
 * Использует BigInt для корректного вычисления на больших дисках (2TB+)
 */
async function getDiskInfo(targetPath: string): Promise<DiskInfo | null> {
  try {
    const stats = await fs.promises.statfs(targetPath)

    // Используем BigInt для корректного умножения на больших дисках
    const blockSize = BigInt(stats.bsize)
    const totalBig = BigInt(stats.blocks) * blockSize
    const freeBig = BigInt(stats.bfree) * blockSize
    const usedBig = totalBig - freeBig

    // Конвертируем обратно в Number для JSON сериализации
    const total = Number(totalBig)
    const free = Number(freeBig)
    const used = Number(usedBig)
    const usedPercent = totalBig > 0n ? Number((usedBig * 100n) / totalBig) : 0

    log.debug('Информация о диске', {
      targetPath,
      bsize: stats.bsize,
      blocks: stats.blocks,
      bfree: stats.bfree,
      total,
      free,
      used,
      usedPercent,
    })

    return { total, free, used, usedPercent }
  } catch (error) {
    log.error('Ошибка получения информации о диске', {
      targetPath,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Рекурсивно подсчитывает размер папки
 */
async function getFolderSize(folderPath: string): Promise<number> {
  let totalSize = 0
  try {
    const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = `${folderPath}/${entry.name}`
      if (entry.isDirectory()) {
        totalSize += await getFolderSize(entryPath)
      } else if (entry.isFile()) {
        try {
          const stat = await fs.promises.stat(entryPath)
          totalSize += stat.size
        } catch {
          // Игнорируем ошибки доступа
        }
      }
    }
  } catch {
    // Папка не существует или нет доступа
  }
  return totalSize
}

/**
 * Обновляет состояние блокировки сна
 */
function updatePowerSaveBlocker(): void {
  const shouldBlock =
    powerSaveState.manualEnabled ||
    (powerSaveState.autoEnabled && (powerSaveState.isTranscoding || powerSaveState.isPlaybackActive))

  if (shouldBlock && powerSaveState.blockerId === null) {
    powerSaveState.blockerId = powerSaveBlocker.start('prevent-display-sleep')
    log.info('Блокировка сна включена', { blockerId: powerSaveState.blockerId })
  } else if (!shouldBlock && powerSaveState.blockerId !== null) {
    powerSaveBlocker.stop(powerSaveState.blockerId)
    log.info('Блокировка сна выключена')
    powerSaveState.blockerId = null
  }
}

/** Экспорт для использования из других модулей */
export function setPowerSaveTranscoding(isTranscoding: boolean): void {
  powerSaveState.isTranscoding = isTranscoding
  updatePowerSaveBlocker()
}

/**
 * Инвалидирует кеш размера библиотеки для указанного пути
 */
export function invalidateLibrarySizeCache(libraryPath?: string): void {
  if (libraryPath) {
    librarySizeCache.invalidate(libraryPath)
  } else {
    librarySizeCache.clear()
  }
  log.debug('Кеш размера библиотеки инвалидирован', { libraryPath })
}

/**
 * Регистрирует IPC handlers для информации о приложении
 */
export function registerAppHandlers(): void {
  // Версия приложения
  createHandler('app:getVersion', () => app.getVersion())

  // Открыть URL во внешнем браузере
  createHandler('app:openExternal', async (url: string) => {
    await shell.openExternal(url)
  })

  // Показать файл/папку в проводнике
  createHandler('app:showInFolder', (fullPath: string) => {
    shell.showItemInFolder(fullPath)
  })

  // Системные пути
  createHandler('app:getPath', (name: string) => app.getPath(name as Parameters<typeof app.getPath>[0]))

  // Количество ядер CPU
  createHandler('app:getCpuCount', () => os.cpus().length)

  // Информация о диске
  createHandler('app:getDiskInfo', async (targetPath?: string) => {
    const pathToCheck = targetPath || app.getPath('userData')
    return getDiskInfo(pathToCheck)
  })

  // Размер папки библиотеки (с кешированием)
  createHandler('app:getLibrarySize', async (libraryPath: string, forceRefresh?: boolean) => {
    // Возвращаем кешированное значение если валидно
    const cached = librarySizeCache.get(libraryPath)
    if (cached !== null && !forceRefresh) {
      return cached
    }

    // Если уже считаем — возвращаем старое значение
    if (librarySizeCache.isCalculating(libraryPath)) {
      return librarySizeCache.getValue(libraryPath) ?? 0
    }

    // Вычисляем новое значение
    librarySizeCache.startCalculation(libraryPath)
    try {
      const size = await getFolderSize(libraryPath)
      librarySizeCache.set(libraryPath, size)
      log.info('Размер библиотеки вычислен', {
        sizeGB: (size / 1024 / 1024 / 1024).toFixed(2),
        libraryPath,
      })
      return size
    } finally {
      librarySizeCache.endCalculation(libraryPath)
    }
  })

  // Инвалидация кеша размера библиотеки
  createHandler('app:invalidateLibrarySizeCache', () => {
    invalidateLibrarySizeCache()
    return true
  })

  // Системное уведомление
  createHandler('app:showNotification', (options: NotificationOptions) => {
    if (!Notification.isSupported()) {
      log.warn('Уведомления не поддерживаются на этой платформе')
      return false
    }

    const notification = new Notification({
      title: options.title,
      body: options.body,
      silent: false,
    })
    notification.show()
    return true
  })

  // === Блокировка спящего режима ===

  createHandler('app:getPowerSaveState', () => ({
    isBlocking: powerSaveState.blockerId !== null,
    autoEnabled: powerSaveState.autoEnabled,
    manualEnabled: powerSaveState.manualEnabled,
  }))

  createHandler('app:togglePowerSaveManual', () => {
    powerSaveState.manualEnabled = !powerSaveState.manualEnabled
    updatePowerSaveBlocker()
    return {
      isBlocking: powerSaveState.blockerId !== null,
      manualEnabled: powerSaveState.manualEnabled,
    }
  })

  createHandler('app:setPowerSaveAuto', (enabled: boolean) => {
    powerSaveState.autoEnabled = enabled
    updatePowerSaveBlocker()
    return { autoEnabled: powerSaveState.autoEnabled }
  })

  createHandler('app:setPowerSavePlayback', (isPlaying: boolean) => {
    powerSaveState.isPlaybackActive = isPlaying
    updatePowerSaveBlocker()
    return { isBlocking: powerSaveState.blockerId !== null }
  })

  // === Setup wizard ===

  createHandler('app:getSetupStatus', () => ({
    needsSetup: _needsSetup,
    defaultLibraryPath: path.join(app.getPath('videos'), 'Animatrona'),
  }))

  createHandler('app:completeSetup', async (libraryPath: string) => {
    await prisma.settings.upsert({
      where: { id: 'default' },
      create: { id: 'default', libraryPath },
      update: { libraryPath },
    })
    _needsSetup = false
    const kubo = getKuboService()
    await kubo.shutdown()
    await kubo.initialize({ libraryPath })
    log.info('Setup завершён', { libraryPath })
  })

  // === Миграция библиотеки ===

  createHandler('app:startLibraryMigration', (opts: { toPath: string; mode: 'copy' | 'move' }) => {
    const win = _mainWindowRef
    runLibraryMigration(opts.toPath, opts.mode, (progress) => {
      win?.webContents.send('app:migration-progress', progress)
    }).catch((err) => {
      log.error('Ошибка миграции библиотеки', { error: String(err) })
    })
    return { started: true }
  })
}
