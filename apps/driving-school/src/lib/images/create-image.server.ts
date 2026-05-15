/**
 * Серверные функции для работы с изображениями
 *
 * ⚠️ ВАЖНО: Этот файл использует sharp и может выполняться только на сервере!
 * Импортируй эти функции только в Server Components или API Routes.
 */

import type { FileCategory } from '@letar/driving-school-db/prisma'
import { PrismaClient } from '@letar/driving-school-db/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import sharp from 'sharp'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma = new PrismaClient({ adapter })

export interface CreateFileParams {
  filename: string
  path: string // относительный путь, например "locations/xxx.jpg"
  mimeType: string
  size: number
  category: FileCategory
  uploadedById?: string
  buffer?: Buffer // для получения размеров изображения
}

export interface FileRecord {
  id: string
  filename: string
  path: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  category: FileCategory
  uploadedById: string | null
  uploadedAt: Date
}

/**
 * Создаёт запись File в БД.
 * Опционально определяет размеры изображения из buffer.
 */
export async function createFileRecord(params: CreateFileParams): Promise<FileRecord> {
  const { filename, path, mimeType, size, category, uploadedById, buffer } = params

  let width: number | null = null
  let height: number | null = null

  // Получаем размеры изображения если передан buffer
  if (buffer && mimeType.startsWith('image/')) {
    try {
      const metadata = await sharp(buffer).metadata()
      width = metadata.width ?? null
      height = metadata.height ?? null
    } catch {
      // Игнорируем ошибки получения размеров
    }
  }

  const file = await prisma.file.create({
    data: {
      filename,
      path,
      mimeType,
      size,
      width,
      height,
      category,
      uploadedById,
    },
  })

  return file
}

/**
 * Удаляет запись File из БД по ID.
 */
export async function deleteFileRecord(id: string): Promise<void> {
  await prisma.file.delete({
    where: { id },
  })
}

/**
 * Удаляет запись File из БД по пути.
 */
export async function deleteFileByPath(path: string): Promise<void> {
  await prisma.file.delete({
    where: { path },
  })
}

/**
 * Получает запись File по ID.
 */
export async function getFileById(id: string): Promise<FileRecord | null> {
  return prisma.file.findUnique({
    where: { id },
  })
}

/**
 * Получает запись File по пути.
 */
export async function getFileByPath(path: string): Promise<FileRecord | null> {
  return prisma.file.findUnique({
    where: { path },
  })
}
