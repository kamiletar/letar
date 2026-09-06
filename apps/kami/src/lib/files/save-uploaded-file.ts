import { prisma } from '@/lib/db'
import { saveFileToDisk } from '@letar/upload-validation'

/** Уникальное имя файла на диске */
function generateStoredName(originalName: string): string {
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : ''
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
}

/**
 * Сохраняет произвольный файл на диск и создаёт запись `UploadedFile`.
 * Общее ядро для `/api/arbitrary-upload` (форма загрузки в админке) и `/share` (Web Share
 * Target с расшаренным не-аудио файлом — картинка, PDF и т.п.).
 */
export async function saveUploadedFile(
  file: File,
  uploadedById: string,
  options?: { description?: string | null; category?: string | null },
) {
  const storedName = generateStoredName(file.name)
  await saveFileToDisk(file, 'files', storedName)

  const path = `files/${storedName}`

  return prisma.uploadedFile.create({
    data: {
      filename: file.name,
      storedName,
      path,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      description: options?.description?.trim() || null,
      category: options?.category?.trim() || null,
      uploadedById,
    },
  })
}
