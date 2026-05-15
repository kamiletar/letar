'use server'

/**
 * Server Actions для CRUD операций с File
 * Файлы (постеры, шрифты и т.д.)
 */

import type { File, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить список файлов
 */
export async function findManyFiles(args?: Prisma.FileFindManyArgs): Promise<File[]> {
  return prisma.file.findMany(args)
}

/**
 * Получить файл по ID
 */
export async function findUniqueFile(id: string, include?: Prisma.FileInclude): Promise<File | null> {
  return prisma.file.findUnique({
    where: { id },
    include,
  })
}

// === CREATE ===

/**
 * Создать файл
 */
export async function createFile(data: Prisma.FileCreateInput): Promise<File> {
  return prisma.file.create({ data })
}

/**
 * Создать несколько файлов
 */
export async function createManyFiles(data: Prisma.FileCreateManyInput[]): Promise<{ count: number }> {
  return prisma.file.createMany({ data })
}

/**
 * Upsert файла по CID — создаёт новый или обновляет существующий.
 * Если CID не указан — создаёт новый файл.
 */
export async function upsertFile(data: Prisma.FileCreateInput): Promise<File> {
  if (data.cid) {
    return prisma.file.upsert({
      where: { cid: data.cid },
      create: data,
      update: {
        filename: data.filename,
        mimeType: data.mimeType,
        size: data.size,
        width: data.width,
        height: data.height,
        blurDataURL: data.blurDataURL,
        category: data.category,
        source: data.source,
      },
    })
  }
  return prisma.file.create({ data })
}

/**
 * Получить постеры без CID (для миграции в IPFS)
 */
export async function getPosterFilesWithoutCid(): Promise<Array<{ id: string }>> {
  return prisma.file.findMany({
    where: { category: 'POSTER', cid: null },
    select: { id: true },
  })
}

// === UPDATE ===

/**
 * Обновить файл
 */
export async function updateFile(id: string, data: Prisma.FileUpdateInput): Promise<File> {
  return prisma.file.update({
    where: { id },
    data,
  })
}

// === DELETE ===

/**
 * Удалить файл
 */
export async function deleteFile(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.file.delete({ where: { id } })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}
