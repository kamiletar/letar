/**
 * Реэкспорт из db-orm.ts для обратной совместимости
 *
 * Основная логика БД находится в db-orm.ts.
 * Этот файл сохранён для единообразия с другими Electron приложениями.
 */
export { flushDatabase, getOrmClient as getEnhancedPrisma } from '../db-orm'
