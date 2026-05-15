'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { readdir, stat, unlink } from 'fs/promises'
import { join, relative } from 'path'

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'

export interface OrphanFile {
  path: string
  size: number
  category: 'PRODUCT' | 'AVATAR' | 'REFERENCE' | 'UNKNOWN'
}

export interface BrokenRecord {
  id: string
  path: string
  category: string
}

export interface SyncResult {
  success: boolean
  // Файлы на диске без записей в БД
  orphanFiles: OrphanFile[]
  // Записи в БД без файлов на диске
  brokenRecords: BrokenRecord[]
  // Статистика
  totalFilesOnDisk: number
  totalRecordsInDb: number
  error?: string
}

/**
 * Определить категорию по пути файла.
 */
function getCategoryFromPath(path: string): OrphanFile['category'] {
  if (path.startsWith('products/')) {
    return 'PRODUCT'
  }
  if (path.startsWith('avatars/')) {
    return 'AVATAR'
  }
  if (path.startsWith('references/')) {
    return 'REFERENCE'
  }
  return 'UNKNOWN'
}

/**
 * Рекурсивно получить все файлы в директории.
 */
async function getAllFiles(dir: string, baseDir: string = dir): Promise<{ path: string; size: number }[]> {
  const files: { path: string; size: number }[] = []

  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        const subFiles = await getAllFiles(fullPath, baseDir)
        files.push(...subFiles)
      } else if (entry.isFile()) {
        // Пропускаем не-изображения
        const ext = entry.name.toLowerCase().split('.').pop()
        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
          const fileStat = await stat(fullPath)
          const relativePath = relative(baseDir, fullPath).replace(/\\/g, '/')
          files.push({ path: relativePath, size: fileStat.size })
        }
      }
    }
  } catch {
    // Директория не существует - это нормально
  }

  return files
}

/**
 * Синхронизация файлов на диске с записями в БД.
 * Находит сиротские файлы и битые записи.
 */
export async function syncImages(): Promise<SyncResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return {
      success: false,
      orphanFiles: [],
      brokenRecords: [],
      totalFilesOnDisk: 0,
      totalRecordsInDb: 0,
      error: 'Unauthorized',
    }
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Получаем все файлы на диске
    const filesOnDisk = await getAllFiles(UPLOADS_DIR)
    const filePathsOnDisk = new Set(filesOnDisk.map((f) => f.path))

    // Получаем все записи из БД
    const recordsInDb = await db.image.findMany({
      select: { id: true, path: true, category: true },
    })
    type RecordInDb = (typeof recordsInDb)[number]
    const recordPathsInDb = new Set(recordsInDb.map((r: RecordInDb) => r.path))

    // Находим сиротские файлы (есть на диске, нет в БД)
    const orphanFiles: OrphanFile[] = filesOnDisk
      .filter((f) => !recordPathsInDb.has(f.path))
      .map((f) => ({
        path: f.path,
        size: f.size,
        category: getCategoryFromPath(f.path),
      }))

    // Находим битые записи (есть в БД, нет на диске)
    const brokenRecords: BrokenRecord[] = recordsInDb
      .filter((r: RecordInDb) => !filePathsOnDisk.has(r.path))
      .map((r: RecordInDb) => ({
        id: r.id,
        path: r.path,
        category: r.category,
      }))

    return {
      success: true,
      orphanFiles,
      brokenRecords,
      totalFilesOnDisk: filesOnDisk.length,
      totalRecordsInDb: recordsInDb.length,
    }
  } catch (error) {
    console.error('Ошибка синхронизации:', error)
    return {
      success: false,
      orphanFiles: [],
      brokenRecords: [],
      totalFilesOnDisk: 0,
      totalRecordsInDb: 0,
      error: 'Ошибка синхронизации',
    }
  }
}

/**
 * Удалить сиротский файл с диска.
 */
export async function deleteOrphanFile(path: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    const fullPath = join(UPLOADS_DIR, path)
    await unlink(fullPath)
    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления файла:', error)
    return { success: false, error: 'Ошибка удаления файла' }
  }
}

/**
 * Удалить битую запись из БД.
 */
export async function deleteBrokenRecord(id: string): Promise<{ success: boolean; error?: string }> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' }
  }

  const db = getEnhancedPrisma(session.user)

  try {
    await db.image.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления записи:', error)
    return { success: false, error: 'Ошибка удаления записи' }
  }
}

/**
 * Массовое удаление всех сиротских файлов.
 */
export async function deleteAllOrphanFiles(): Promise<{ success: boolean; deleted: number; error?: string }> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, deleted: 0, error: 'Unauthorized' }
  }

  try {
    const syncResult = await syncImages()
    if (!syncResult.success) {
      return { success: false, deleted: 0, error: syncResult.error }
    }

    let deleted = 0
    for (const file of syncResult.orphanFiles) {
      try {
        const fullPath = join(UPLOADS_DIR, file.path)
        await unlink(fullPath)
        deleted++
      } catch {
        // Пропускаем файлы которые не удалось удалить
      }
    }

    return { success: true, deleted }
  } catch (error) {
    console.error('Ошибка массового удаления:', error)
    return { success: false, deleted: 0, error: 'Ошибка массового удаления' }
  }
}

/**
 * Массовое удаление всех битых записей.
 */
export async function deleteAllBrokenRecords(): Promise<{ success: boolean; deleted: number; error?: string }> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, deleted: 0, error: 'Unauthorized' }
  }

  const db = getEnhancedPrisma(session.user)

  try {
    const syncResult = await syncImages()
    if (!syncResult.success) {
      return { success: false, deleted: 0, error: syncResult.error }
    }

    let deleted = 0
    for (const record of syncResult.brokenRecords) {
      try {
        await db.image.delete({ where: { id: record.id } })
        deleted++
      } catch {
        // Пропускаем записи которые не удалось удалить
      }
    }

    return { success: true, deleted }
  } catch (error) {
    console.error('Ошибка массового удаления записей:', error)
    return { success: false, deleted: 0, error: 'Ошибка массового удаления записей' }
  }
}
