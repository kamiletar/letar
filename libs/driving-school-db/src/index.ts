/**
 * @letar/driving-school-db — Генерируемые типы и схемы для driving-school
 *
 * Содержит Prisma Client, ZenStack схемы, form-schemas.
 * Генерируется через `nx zenstack:generate driving-school`.
 *
 * ## Импорты
 *
 * ```typescript
 * import type { User, School } from '@letar/driving-school-db/prisma'
 * import { Gender } from '@letar/driving-school-db/prisma/enums'
 * import { schema } from '@letar/driving-school-db/schema'
 * import { GenderFormSchema } from '@letar/driving-school-db/form-schemas/enums/Gender.form'
 * ```
 */

// Реэкспорт основных модулей для удобства
export { schema } from './generated/schema'
