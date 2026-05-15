/**
 * Общие типы для работы с БД
 *
 * Выделены для устранения дублирования type DbClient в 7+ файлах.
 */

import type { getEnhancedPrisma } from '@/lib/db'

/** Enhanced Prisma клиент с политиками доступа ZenStack */
export type DbClient = ReturnType<typeof getEnhancedPrisma>
