/**
 * Утилиты сохранения файлов на диск.
 * Паттерн аналогичен driving-school.
 */

import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Генерирует уникальное имя файла
 *
 * @example
 * generateFilename('photo.jpg') // '1704672000000-abc123xyz.jpg'
 */
export function generateFilename(originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const rawExtension = originalName.split('.').pop() || 'bin'
  // Расширение попадает в путь на диске — вырезаем всё, кроме буквенно-цифровых
  // символов, иначе `../` внутри originalName пробивает join() до записи файла.
  const extension = rawExtension.replace(/[^a-zA-Z0-9]/g, '') || 'bin'
  return `${timestamp}-${randomString}.${extension}`
}

/**
 * Создаёт директорию для загрузки если не существует
 */
export async function ensureUploadDir(subdir: string): Promise<string> {
  const uploadsDir = join(process.cwd(), 'uploads', subdir)
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }
  return uploadsDir
}

/**
 * Сохраняет файл на диск
 *
 * @returns Относительный путь файла (для хранения в БД)
 */
export async function saveFileToDisk(
  file: File,
  subdir: string,
  filename: string,
): Promise<{ path: string; buffer: Buffer }> {
  const uploadsDir = await ensureUploadDir(subdir)
  const filepath = join(uploadsDir, filename)

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  await writeFile(filepath, buffer)

  return {
    path: `${subdir}/${filename}`,
    buffer,
  }
}

/**
 * Удаляет файл с диска (безопасно игнорирует ошибки)
 */
export async function deleteFileFromDisk(relativePath: string): Promise<void> {
  try {
    const filepath = join(process.cwd(), 'uploads', relativePath)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }
  } catch {
    // Игнорируем ошибки при удалении
  }
}
