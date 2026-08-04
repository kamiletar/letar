import { createUploadsRoute } from '@letar/image-upload/server'

/**
 * Раздача загруженных файлов из `uploads/`.
 * Общая реализация — `@letar/image-upload/server`.
 */
export const GET = createUploadsRoute()
