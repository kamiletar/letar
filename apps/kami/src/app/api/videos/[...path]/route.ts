import { createUploadsRoute } from '@letar/image-upload/server'

/**
 * Раздача расшаренных видеофайлов из `uploads/videos/`.
 * Общая реализация — `@letar/image-upload/server`: она же отдаёт Range-запросы
 * (перемотка `<video>` в плеере), как и `/api/files` для `UploadedFile`.
 */
export const GET = createUploadsRoute()
