/**
 * Сервис миграции библиотеки и IPFS хранилища на новый диск
 */

import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

import { prisma } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'
import { getDefaultLibraryPath } from '../output-path-resolver'

const log = createModuleLogger('LibraryMigration')

export interface MigrationProgress {
  phase: 'stopping-kubo' | 'copying' | 'updating-settings' | 'starting-kubo' | 'done' | 'error'
  progress: number
  currentFile?: string
  totalFiles?: number
  error?: string
}

/** Рекурсивно собирает все файлы в директории, исключая указанные подпапки */
async function collectFiles(dir: string, excludeDirs: string[] = []): Promise<string[]> {
  const result: string[] = []
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return result
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (excludeDirs.includes(entry.name)) {
        continue
      }
      result.push(...(await collectFiles(fullPath, excludeDirs)))
    } else if (entry.isFile()) {
      result.push(fullPath)
    }
  }
  return result
}

/** Копирует файл, создавая промежуточные директории */
async function copyFile(src: string, dest: string): Promise<void> {
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.copyFile(src, dest)
}

/** Удаляет пустые директории рекурсивно снизу вверх */
async function removeEmptyDirs(dir: string): Promise<void> {
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    await removeEmptyDirs(path.join(dir, entry))
  }
  try {
    await fs.rmdir(dir)
  } catch {
    // директория не пустая — оставляем
  }
}

/**
 * Переносит библиотеку и IPFS хранилище на новый диск.
 * Останавливает Kubo перед переносом, запускает с новым путём после.
 */
export async function runLibraryMigration(
  toPath: string,
  mode: 'copy' | 'move',
  onProgress: (p: MigrationProgress) => void,
): Promise<void> {
  log.info('Начинаю миграцию библиотеки', { toPath, mode })

  try {
    // Определяем текущие пути
    const settings = await prisma.settings.findFirst()
    const fromLibraryPath = settings?.libraryPath || getDefaultLibraryPath()
    const storageMaxGb = settings?.ipfsStorageMaxGb ?? 500

    // IPFS мог быть в подпапке библиотеки или в legacy userData/kubo-repo
    const legacyIpfsPath = path.join(app.getPath('userData'), 'kubo-repo')
    const embeddedIpfsPath = path.join(fromLibraryPath, 'ipfs')
    const fromIpfsPath = await fs
      .access(embeddedIpfsPath)
      .then(() => embeddedIpfsPath)
      .catch(() => legacyIpfsPath)

    log.info('Пути миграции', { fromLibraryPath, fromIpfsPath, toPath })

    // 1. Остановить Kubo
    onProgress({ phase: 'stopping-kubo', progress: 0 })
    const kubo = getKuboService()
    await kubo.shutdown()
    log.info('Kubo остановлен')

    // 2. Собрать файлы для копирования (библиотека без папки ipfs, отдельно IPFS)
    const libraryFiles = await collectFiles(fromLibraryPath, ['ipfs'])
    const ipfsFiles = await collectFiles(fromIpfsPath)
    const totalFiles = libraryFiles.length + ipfsFiles.length

    log.info('Файлы для миграции', { libraryFiles: libraryFiles.length, ipfsFiles: ipfsFiles.length })

    onProgress({ phase: 'copying', progress: 0, totalFiles })

    let done = 0
    const reportProgress = (currentFile: string) => {
      done++
      onProgress({
        phase: 'copying',
        progress: totalFiles > 0 ? Math.round((done / totalFiles) * 98) : 50,
        currentFile: path.basename(currentFile),
        totalFiles,
      })
    }

    // 3. Копируем/перемещаем файлы библиотеки
    for (const file of libraryFiles) {
      const rel = path.relative(fromLibraryPath, file)
      const dest = path.join(toPath, rel)
      await copyFile(file, dest)
      if (mode === 'move') {
        await fs.unlink(file)
      }
      reportProgress(file)
    }

    // 4. Копируем/перемещаем IPFS repo в {toPath}/ipfs/
    const toIpfsPath = path.join(toPath, 'ipfs')
    for (const file of ipfsFiles) {
      const rel = path.relative(fromIpfsPath, file)
      const dest = path.join(toIpfsPath, rel)
      await copyFile(file, dest)
      if (mode === 'move') {
        await fs.unlink(file)
      }
      reportProgress(file)
    }

    // 5. Удаляем пустые директории при перемещении
    if (mode === 'move') {
      await removeEmptyDirs(fromLibraryPath).catch(() => {})
      if (fromIpfsPath !== fromLibraryPath) {
        await removeEmptyDirs(fromIpfsPath).catch(() => {})
      }
    }

    // 6. Обновляем Settings в БД
    onProgress({ phase: 'updating-settings', progress: 99 })
    await prisma.settings.upsert({
      where: { id: 'default' },
      create: { id: 'default', libraryPath: toPath },
      update: { libraryPath: toPath },
    })
    log.info('Settings обновлены', { libraryPath: toPath })

    // 7. Перезапускаем Kubo с новым путём
    onProgress({ phase: 'starting-kubo', progress: 99 })
    await kubo.initialize({ libraryPath: toPath, storageMaxGb })
    log.info('Kubo перезапущен с новым путём')

    onProgress({ phase: 'done', progress: 100 })
    log.info('Миграция завершена', { toPath, mode })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    log.error('Ошибка миграции', { error: errorMsg })
    onProgress({ phase: 'error', progress: 0, error: errorMsg })
    throw error
  }
}
