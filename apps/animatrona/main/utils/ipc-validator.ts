/**
 * Утилиты для валидации IPC данных с помощью Zod
 *
 * Обеспечивает:
 * - Типобезопасность на границе main/renderer
 * - Защиту от path traversal и injection
 * - Единообразную обработку ошибок
 */

import type { IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'

import { createModuleLogger } from './logger'

const log = createModuleLogger('IpcValidator')

/** Результат IPC операции */
export interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: z.ZodError
}

/**
 * Создаёт валидированный IPC handler
 *
 * @example
 * ipcMain.handle('myChannel', createValidatedHandler(
 *   z.object({ filePath: z.string(), options: z.object({...}) }),
 *   async (data) => {
 *     // data уже типизирован и валидирован
 *     return await processFile(data.filePath, data.options)
 *   }
 * ))
 */
export function createValidatedHandler<TSchema extends z.ZodType, TResult = unknown>(
  schema: TSchema,
  handler: (data: z.infer<TSchema>, event: IpcMainInvokeEvent) => Promise<TResult>
): (event: IpcMainInvokeEvent, data: unknown) => Promise<IpcResult<TResult>> {
  return async (event: IpcMainInvokeEvent, data: unknown): Promise<IpcResult<TResult>> => {
    // Валидация входных данных
    const parsed = schema.safeParse(data)

    if (!parsed.success) {
      log.error('IPC validation failed', {
        data: JSON.stringify(data, null, 2).slice(0, 2000),
        errors: JSON.stringify(parsed.error.format(), null, 2),
      })
      return {
        success: false,
        error: 'Validation failed',
        details: parsed.error,
      }
    }

    try {
      const result = await handler(parsed.data, event)
      return { success: true, data: result }
    } catch (error) {
      log.error('IPC handler error', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}

/**
 * Создаёт валидированный IPC handler без возвращаемых данных
 *
 * @example
 * ipcMain.handle('action', createValidatedAction(schema, async (data) => {
 *   await doSomething(data)
 * }))
 */
export function createValidatedAction<TSchema extends z.ZodType>(
  schema: TSchema,
  handler: (data: z.infer<TSchema>, event: IpcMainInvokeEvent) => Promise<void>
): (event: IpcMainInvokeEvent, data: unknown) => Promise<IpcResult<void>> {
  return createValidatedHandler(schema, handler)
}

// ============================================================
// Общие схемы валидации
// ============================================================

/** Безопасный путь к файлу (без path traversal) */
export const safePathSchema = z
  .string()
  .min(1, 'Path cannot be empty')
  .refine(
    (path) => {
      // Запрещаем path traversal
      const normalized = path.replace(/\\/g, '/')
      return !normalized.includes('../') && !normalized.includes('./')
    },
    { message: 'Path traversal detected' }
  )

/** Абсолютный путь (должен начинаться с буквы диска или /) */
export const absolutePathSchema = safePathSchema.refine(
  (path) => {
    // Windows: C:\... или \\server\...
    // Unix: /...
    return /^([A-Za-z]:|\\\\|\/)/u.test(path)
  },
  { message: 'Path must be absolute' }
)

/** Положительное целое число */
export const positiveIntSchema = z.number().int().positive()

/** Неотрицательное целое число */
export const nonNegativeIntSchema = z.number().int().nonnegative()

/** ID (непустая строка) */
export const idSchema = z.string().min(1, 'ID cannot be empty')

// ============================================================
// Схемы для FFmpeg операций
// ============================================================

/** Схема для probe */
export const probeSchema = z.object({
  filePath: absolutePathSchema,
})

/** Схема для транскодирования видео */
export const videoTranscodeSchema = z.object({
  input: absolutePathSchema,
  output: absolutePathSchema,
  options: z.object({
    codec: z.enum(['av1', 'hevc', 'h264']).optional(),
    crf: z.number().min(0).max(63).optional(),
    preset: z.string().optional(),
    width: positiveIntSchema.optional(),
    height: positiveIntSchema.optional(),
    fps: positiveIntSchema.optional(),
    bitrate: z.string().optional(),
    hwaccel: z.boolean().optional(),
  }),
})

/** Схема для транскодирования аудио */
export const audioTranscodeSchema = z.object({
  input: absolutePathSchema,
  output: absolutePathSchema,
  options: z.object({
    codec: z.enum(['aac', 'opus', 'flac', 'copy']).optional(),
    bitrate: z.string().optional(),
    channels: z.number().min(1).max(8).optional(),
    sampleRate: z.number().optional(),
    trackIndex: nonNegativeIntSchema.optional(),
  }),
})

/** Схема для merge MKV */
export const mergeSchema = z.object({
  output: absolutePathSchema,
  video: absolutePathSchema.optional(),
  audioTracks: z
    .array(
      z.object({
        path: absolutePathSchema,
        language: z.string().optional(),
        title: z.string().optional(),
        default: z.boolean().optional(),
      })
    )
    .optional(),
  subtitleTracks: z
    .array(
      z.object({
        path: absolutePathSchema,
        language: z.string().optional(),
        title: z.string().optional(),
        default: z.boolean().optional(),
      })
    )
    .optional(),
  fonts: z.array(absolutePathSchema).optional(),
  chapters: absolutePathSchema.optional(),
})

// ============================================================
// Схемы для файловых операций
// ============================================================

/** Схема для сканирования папки */
export const scanFolderSchema = z.object({
  folderPath: absolutePathSchema,
  recursive: z.boolean().optional(),
  extensions: z.array(z.string()).optional(),
})

/** Схема для чтения файла */
export const readFileSchema = z.object({
  filePath: absolutePathSchema,
  encoding: z.enum(['utf-8', 'utf8', 'binary', 'base64']).optional(),
})

/** Схема для записи файла */
export const writeFileSchema = z.object({
  filePath: absolutePathSchema,
  content: z.union([z.string(), z.instanceof(Buffer)]),
  encoding: z.enum(['utf-8', 'utf8', 'binary', 'base64']).optional(),
})

// ============================================================
// Схемы для parallel transcode
// ============================================================

// ПРИМЕЧАНИЕ: Основные схемы для parallel transcode определены в
// main/ipc/parallel-transcode.handlers.ts рядом с handlers

/** Схема для установки concurrency */
export const setConcurrencySchema = z.object({
  value: positiveIntSchema.max(24),
})
