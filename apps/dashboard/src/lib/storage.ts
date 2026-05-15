import { promises as fs } from 'fs'
import path from 'path'

export interface FileInfo {
  path: string
  name: string
  size: number
  modified: Date
}

export interface StorageStats {
  uploads: { size: number; files: number }
  nextStatic: { size: number; files: number }
  public: { size: number; files: number }
  total: number
  largestFiles: FileInfo[]
}

/**
 * Рекурсивно подсчитывает размер директории
 */
export async function getDirectorySize(dirPath: string): Promise<{ size: number; files: number }> {
  let totalSize = 0
  let fileCount = 0

  try {
    const stats = await fs.stat(dirPath)

    if (!stats.isDirectory()) {
      return { size: stats.size, files: 1 }
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        const subDirStats = await getDirectorySize(fullPath)
        totalSize += subDirStats.size
        fileCount += subDirStats.files
      } else {
        const fileStats = await fs.stat(fullPath)
        totalSize += fileStats.size
        fileCount++
      }
    }

    return { size: totalSize, files: fileCount }
  } catch {
    // Директория не существует или недоступна
    return { size: 0, files: 0 }
  }
}

/**
 * Возвращает N самых больших файлов в директории
 */
export async function getLargestFiles(dirPath: string, limit = 10): Promise<FileInfo[]> {
  const files: FileInfo[] = []

  async function scanDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await scanDirectory(fullPath)
        } else {
          const stats = await fs.stat(fullPath)
          files.push({
            path: fullPath,
            name: entry.name,
            size: stats.size,
            modified: stats.mtime,
          })
        }
      }
    } catch {
      // Пропускаем директории, к которым нет доступа
    }
  }

  try {
    await scanDirectory(dirPath)

    // Сортируем по размеру (убывание) и берём топ N
    return files.sort((a, b) => b.size - a.size).slice(0, limit)
  } catch {
    return []
  }
}

/**
 * Удаляет файлы старше N дней
 * Возвращает количество удалённых файлов
 */
export async function cleanOldFiles(dirPath: string, olderThanDays: number): Promise<number> {
  let deletedCount = 0
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

  async function scanAndDelete(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await scanAndDelete(fullPath)

          // Пытаемся удалить пустые директории
          try {
            const subEntries = await fs.readdir(fullPath)
            if (subEntries.length === 0) {
              await fs.rmdir(fullPath)
            }
          } catch {
            // Директория не пуста или не может быть удалена
          }
        } else {
          const stats = await fs.stat(fullPath)

          if (stats.mtime < cutoffDate) {
            try {
              await fs.unlink(fullPath)
              deletedCount++
            } catch (error) {
              console.error(`Failed to delete ${fullPath}:`, error)
            }
          }
        }
      }
    } catch {
      // Пропускаем директории, к которым нет доступа
    }
  }

  try {
    await scanAndDelete(dirPath)
  } catch (error) {
    console.error(`Error cleaning old files in ${dirPath}:`, error)
  }

  return deletedCount
}

/**
 * Получает полную статистику хранилища для приложения
 */
export async function getStorageStats(appName: string): Promise<StorageStats> {
  const workspaceRoot = process.env.WORKSPACE_ROOT || ''
  const appPath = path.join(workspaceRoot, 'apps', appName)

  // Определяем пути для проверки
  const uploadPath = path.join(appPath, 'uploads')
  const nextStaticPath = path.join(appPath, '.next', 'static')
  const publicPath = path.join(appPath, 'public')

  // Получаем размеры параллельно
  const [uploadsStats, nextStaticStats, publicStats] = await Promise.all([
    getDirectorySize(uploadPath),
    getDirectorySize(nextStaticPath),
    getDirectorySize(publicPath),
  ])

  // Получаем самые большие файлы из uploads
  const largestFiles = await getLargestFiles(uploadPath, 10)

  const total = uploadsStats.size + nextStaticStats.size + publicStats.size

  return {
    uploads: uploadsStats,
    nextStatic: nextStaticStats,
    public: publicStats,
    total,
    largestFiles,
  }
}

// Реэкспорт formatBytes из format.ts для обратной совместимости
export { formatBytes } from './format'
