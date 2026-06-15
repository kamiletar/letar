/**
 * Re-export из db.ts для совместимости.
 * Новый код должен импортировать из '@/lib/db'.
 */
export type * from './db'
export { getEnhancedPrisma, prisma, rawOrm } from './db'
