/**
 * Общие Zod схемы для API endpoints
 */

import { SUPPORTED_APPS, SUPPORTED_DATABASES } from '@/lib/constants'
import { z } from 'zod/v4'

// =============================================================================
// Pagination
// =============================================================================

/** Схема пагинации */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type Pagination = z.infer<typeof PaginationSchema>

// =============================================================================
// ID параметры
// =============================================================================

/** Схема ID параметра (строка, не пустая) */
export const IdParamSchema = z.string().min(1, 'ID обязателен')

// =============================================================================
// Приложения и базы данных
// =============================================================================

/** Схема имени приложения */
export const AppNameSchema = z.enum(SUPPORTED_APPS)

/** Схема имени базы данных */
export const DatabaseNameSchema = z.enum(SUPPORTED_DATABASES)

// =============================================================================
// Deploy
// =============================================================================

/** Схема запроса на запуск деплоя */
export const DeployStartSchema = z
  .object({
    app: AppNameSchema.optional(),
    dryRun: z.boolean().default(false),
  })
  .strip()

export type DeployStartInput = z.infer<typeof DeployStartSchema>

// =============================================================================
// Database restore
// =============================================================================

/** Схема запроса на восстановление бэкапа */
export const DatabaseRestoreSchema = z
  .object({
    backupId: z.string().min(1, 'ID бэкапа обязателен'),
  })
  .strip()

export type DatabaseRestoreInput = z.infer<typeof DatabaseRestoreSchema>

// =============================================================================
// Docker containers
// =============================================================================

/** Схема query параметров для списка контейнеров */
export const ContainersQuerySchema = z.object({
  all: z.coerce.boolean().default(false),
  stats: z.coerce.boolean().default(false),
})

export type ContainersQuery = z.infer<typeof ContainersQuerySchema>
