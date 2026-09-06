import { prisma } from '@/lib/db'
import { saveFileToDisk } from '@letar/upload-validation'

/** Уникальное имя файла на диске */
function generateStoredName(originalName: string): string {
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : ''
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
}

/**
 * Сохраняет расшаренный видеофайл на диск и создаёт запись `Video` (source: FILE).
 * По образцу `saveUploadedFile` — общего извлечения длительности/превью нет (потребовал бы
 * ffmpeg, которого в этом приложении нет), `<video>` на клиенте показывает первый кадр сам.
 */
export async function saveVideoFile(file: File, uploadedById: string, title: string | null) {
  const storedName = generateStoredName(file.name)
  await saveFileToDisk(file, 'videos', storedName)

  const path = `videos/${storedName}`

  return prisma.video.create({
    data: {
      source: 'FILE',
      title: title || file.name,
      filename: file.name,
      storedName,
      path,
      mimeType: file.type || 'video/mp4',
      size: file.size,
      uploadedById,
    },
  })
}
