// Клиентские функции (URL helpers) — безопасны для импорта везде
export { getFileUrl, getFileUrlById } from './create-image'

// Типы — безопасны для импорта везде
export type { CreateFileParams, FileRecord } from './create-image'

// ============================================================================
// СЕРВЕРНЫЕ ФУНКЦИИ
// ============================================================================
//
// ⚠️ ВНИМАНИЕ: Функции ниже используют sharp и могут выполняться только на сервере!
// Импортируй их напрямую из './create-image.server' только в:
// - Server Components
// - API Routes
// - Server Actions
//
// Примеры:
// ```ts
// // ✅ В Server Component или API Route
// import { createFileRecord } from '@/lib/images/create-image.server'
//
// // ❌ НЕ импортируй в Client Components!
// // import { createFileRecord } from '@/lib/images'
// ```
//
// Доступные серверные функции:
// - createFileRecord
// - deleteFileRecord
// - deleteFileByPath
// - getFileById
// - getFileByPath
