/**
 * Re-export from db.ts for backward compatibility.
 * New code should import from '@/lib/db' directly.
 */
export type * from './db'
export { getEnhancedPrisma, prisma } from './db'
