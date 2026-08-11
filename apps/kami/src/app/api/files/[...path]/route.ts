import { prisma } from '@/lib/db'
import { createUploadsRoute } from '@letar/image-upload/server'

/**
 * Раздача загруженных файлов из `uploads/`.
 * Общая реализация — `@letar/image-upload/server`: она же отдаёт
 * Range-запросы (перемотка аудио в плеере) для любого типа файлов.
 */
export const GET = createUploadsRoute({
  headers: async ({ segments, relPath }) => {
    // Произвольные файлы (uploads/files/<name>) отдаём с оригинальным именем из БД —
    // на диске они лежат под сгенерированным именем.
    if (segments[0] !== 'files' || segments.length !== 2) { return undefined }

    const record = await prisma.uploadedFile.findUnique({
      where: { path: relPath },
      select: { filename: true },
    })
    if (!record?.filename) { return undefined }

    return {
      // RFC 5987 — поддержка UTF-8 имён (пробелы, кириллица и т.д.)
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(record.filename)}`,
    }
  },
})
