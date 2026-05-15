'use server'

/**
 * Server Actions для CRUD операций с ImportQueueItem
 *
 * Используется для персистенса очереди импорта в SQLite
 */

import type { ImportQueueItem, ImportQueueItemStatus, Prisma } from '@/generated/prisma'
import { prisma } from '@/lib/db'

// === READ ===

/**
 * Получить все элементы очереди
 */
export async function getImportQueueItems(): Promise<ImportQueueItem[]> {
  return prisma.importQueueItem.findMany({
    orderBy: [{ priority: 'asc' }, { addedAt: 'asc' }],
  })
}

/**
 * Получить элемент по ID
 */
export async function getImportQueueItem(id: string): Promise<ImportQueueItem | null> {
  return prisma.importQueueItem.findUnique({
    where: { id },
  })
}

/**
 * Получить активные элементы (pending, preparing, transcoding, postprocess)
 */
export async function getActiveImportQueueItems(): Promise<ImportQueueItem[]> {
  return prisma.importQueueItem.findMany({
    where: {
      status: {
        in: ['PENDING', 'PREPARING', 'TRANSCODING', 'POSTPROCESS'],
      },
    },
    orderBy: [{ priority: 'asc' }, { addedAt: 'asc' }],
  })
}

/**
 * Получить pending элементы
 */
export async function getPendingImportQueueItems(): Promise<ImportQueueItem[]> {
  return prisma.importQueueItem.findMany({
    where: { status: 'PENDING' },
    orderBy: [{ priority: 'asc' }, { addedAt: 'asc' }],
  })
}

// === CREATE ===

/**
 * Создать элемент очереди
 */
export async function createImportQueueItem(data: Prisma.ImportQueueItemCreateInput): Promise<ImportQueueItem> {
  return prisma.importQueueItem.create({ data })
}

// === UPDATE ===

/**
 * Обновить элемент очереди
 */
export async function updateImportQueueItem(
  id: string,
  data: Prisma.ImportQueueItemUpdateInput
): Promise<ImportQueueItem> {
  return prisma.importQueueItem.update({
    where: { id },
    data,
  })
}

/**
 * Обновить статус элемента
 */
export async function updateImportQueueItemStatus(
  id: string,
  status: ImportQueueItemStatus,
  error?: string
): Promise<ImportQueueItem> {
  const data: Prisma.ImportQueueItemUpdateInput = { status }

  if (error !== undefined) {
    data.error = error
  }

  // Устанавливаем временные метки в зависимости от статуса
  if (status === 'PREPARING') {
    data.startedAt = new Date()
  } else if (['COMPLETED', 'ERROR', 'CANCELLED'].includes(status)) {
    data.completedAt = new Date()
  }

  return prisma.importQueueItem.update({
    where: { id },
    data,
  })
}

/**
 * Обновить прогресс элемента
 */
export async function updateImportQueueItemProgress(
  id: string,
  progress: number,
  currentFileName?: string
): Promise<ImportQueueItem> {
  return prisma.importQueueItem.update({
    where: { id },
    data: {
      progress,
      currentFileName: currentFileName ?? null,
    },
  })
}

/**
 * Сохранить результаты создания аниме
 */
export async function saveImportQueueItemResults(
  id: string,
  createdAnimeId: string,
  createdAnimeFolder: string
): Promise<ImportQueueItem> {
  return prisma.importQueueItem.update({
    where: { id },
    data: {
      createdAnimeId,
      createdAnimeFolder,
    },
  })
}

// === UPSERT ===

/**
 * Создать или обновить элемент очереди
 */
export async function upsertImportQueueItem(data: {
  id: string
  status: ImportQueueItemStatus
  priority: number
  addedAt: Date
  startedAt?: Date | null
  completedAt?: Date | null
  dataJson: string
  error?: string | null
  progress?: number
  currentFileName?: string | null
  createdAnimeId?: string | null
  createdAnimeFolder?: string | null
}): Promise<ImportQueueItem> {
  return prisma.importQueueItem.upsert({
    where: { id: data.id },
    create: {
      id: data.id,
      status: data.status,
      priority: data.priority,
      addedAt: data.addedAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      dataJson: data.dataJson,
      error: data.error,
      progress: data.progress ?? 0,
      currentFileName: data.currentFileName,
      createdAnimeId: data.createdAnimeId,
      createdAnimeFolder: data.createdAnimeFolder,
    },
    update: {
      status: data.status,
      priority: data.priority,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      dataJson: data.dataJson,
      error: data.error,
      progress: data.progress,
      currentFileName: data.currentFileName,
      createdAnimeId: data.createdAnimeId,
      createdAnimeFolder: data.createdAnimeFolder,
    },
  })
}

// === DELETE ===

/**
 * Удалить элемент очереди
 */
export async function deleteImportQueueItem(id: string): Promise<ImportQueueItem> {
  return prisma.importQueueItem.delete({
    where: { id },
  })
}

/**
 * Удалить завершённые элементы (completed, error, cancelled)
 */
export async function deleteCompletedImportQueueItems(): Promise<number> {
  const result = await prisma.importQueueItem.deleteMany({
    where: {
      status: {
        in: ['COMPLETED', 'ERROR', 'CANCELLED'],
      },
    },
  })
  return result.count
}

/**
 * Удалить все элементы
 */
export async function deleteAllImportQueueItems(): Promise<number> {
  const result = await prisma.importQueueItem.deleteMany()
  return result.count
}

// === UTILITY ===

/**
 * Получить следующий приоритет для нового элемента
 */
export async function getNextPriority(): Promise<number> {
  const maxItem = await prisma.importQueueItem.findFirst({
    orderBy: { priority: 'desc' },
    select: { priority: true },
  })
  return (maxItem?.priority ?? 0) + 1
}

/**
 * Восстановить прерванные элементы (PREPARING, TRANSCODING, POSTPROCESS → PENDING)
 * Используется при перезапуске приложения
 */
export async function restoreInterruptedItems(): Promise<number> {
  const result = await prisma.importQueueItem.updateMany({
    where: {
      status: {
        in: ['PREPARING', 'TRANSCODING', 'POSTPROCESS'],
      },
    },
    data: {
      status: 'PENDING',
      progress: 0,
      currentFileName: null,
      startedAt: null,
    },
  })
  return result.count
}
