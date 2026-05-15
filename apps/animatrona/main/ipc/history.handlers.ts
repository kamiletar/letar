/**
 * IPC handlers для истории импортов
 *
 * Каналы:
 * - history:getAll — получить все записи
 * - history:get — получить записи с фильтром
 * - history:getById — получить запись по ID
 * - history:add — добавить запись
 * - history:delete — удалить запись
 * - history:clear — очистить историю
 * - history:getStats — получить статистику
 * - history:getRecent — получить последние N записей
 */

import { ipcMain } from 'electron'
import { z } from 'zod'

import type { ImportHistoryCreateData, ImportHistoryFilter } from '../../shared/types/import-history'
import {
  addHistoryEntry,
  clearHistory,
  deleteHistoryEntry,
  getAllHistory,
  getHistory,
  getHistoryById,
  getHistoryStats,
  getRecentHistory,
} from '../services/history-store'
import { createHandler } from '../utils/ipc-handler-factory'
import { createValidatedHandler, idSchema } from '../utils/ipc-validator'

// === Zod схемы ===

const historyFilterSchema: z.ZodType<ImportHistoryFilter> = z.object({
  status: z.enum(['completed', 'error', 'cancelled']).optional(),
  search: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional(),
})

const historyCreateSchema: z.ZodType<ImportHistoryCreateData> = z.object({
  queueItemId: z.string(),
  animeName: z.string(),
  animeNameRu: z.string().optional(),
  animeId: z.string().optional(),
  shikimoriId: z.number().optional(),
  posterUrl: z.string().optional(),
  episodesCount: z.number().int(),
  seasonNumber: z.number().int().optional(),
  status: z.enum(['completed', 'error', 'cancelled']),
  errorMessage: z.string().optional(),
  startedAt: z.string(),
  completedAt: z.string(),
  durationMs: z.number(),
  totalSizeBytes: z.number().optional(),
  vmafScore: z.number().optional(),
  cqValue: z.number().optional(),
  usedCpuFallback: z.boolean().optional(),
  templateId: z.string().optional(),
  profileId: z.string().optional(),
  sourceFolderPath: z.string().optional(),
})

/**
 * Регистрирует IPC handlers для истории импортов
 */
export function registerHistoryHandlers(): void {
  // Получить все записи
  createHandler('history:getAll', () => getAllHistory())

  // Получить записи с фильтром
  ipcMain.handle(
    'history:get',
    createValidatedHandler(historyFilterSchema.optional(), (filter?: ImportHistoryFilter) => getHistory(filter))
  )

  // Получить запись по ID
  ipcMain.handle(
    'history:getById',
    createValidatedHandler(idSchema, (id: string) => getHistoryById(id))
  )

  // Добавить запись
  ipcMain.handle(
    'history:add',
    createValidatedHandler(historyCreateSchema, (data: ImportHistoryCreateData) => addHistoryEntry(data))
  )

  // Удалить запись
  ipcMain.handle(
    'history:delete',
    createValidatedHandler(idSchema, (id: string) => deleteHistoryEntry(id))
  )

  // Очистить историю
  createHandler('history:clear', () => clearHistory())

  // Получить статистику
  createHandler('history:getStats', () => getHistoryStats())

  // Получить последние N записей
  createHandler('history:getRecent', (limit?: number) => getRecentHistory(limit))
}
