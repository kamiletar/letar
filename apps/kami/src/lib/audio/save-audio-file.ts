import { prisma } from '@/lib/db'
import { uniqueSlug } from '@/lib/utils/slugify'
import { saveFileToDisk } from '@letar/upload-validation'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { parseBuffer } from 'music-metadata'
import { join } from 'path'

/** Извлечь человекочитаемое название из имени файла */
function titleFromFilename(filename: string): string {
  const name = filename.replace(/\.[^.]+$/, '')
  return name.replace(/[-_]+/g, ' ').trim()
}

/** Сохранить обложку из ID3 тегов */
async function saveCover(picture: { data: Uint8Array; format: string }): Promise<string | null> {
  try {
    const coversDir = join(process.cwd(), 'uploads', 'audio', 'covers')
    if (!existsSync(coversDir)) {
      await mkdir(coversDir, { recursive: true })
    }

    const ext = picture.format.includes('png') ? 'png' : 'jpg'
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`
    const { path } = await saveFileToDisk(
      new File([Buffer.from(picture.data)], filename),
      'audio/covers',
      filename,
    )

    return path
  } catch (error) {
    console.error('[Audio Upload] Ошибка сохранения обложки:', error)
    return null
  }
}

/** Уникальное имя файла на диске */
function generateAudioFilename(originalName: string): string {
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : ''
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
}

/**
 * Сохраняет аудиофайл на диск, парсит ID3-метаданные и создаёт запись `AudioFile`.
 * Общее ядро для `/api/audio/upload` (форма загрузки в админке) и `/share` (Web Share Target
 * с расшаренным `audio/*` файлом — тот же пайплайн, что и ручная загрузка).
 */
export async function saveAudioFile(file: File, uploadedById: string, customTitle?: string | null) {
  const filename = generateAudioFilename(file.name)
  const { buffer } = await saveFileToDisk(file, 'audio', filename)

  let artist: string | undefined
  let album: string | undefined
  let duration: number | undefined
  let bitrate: number | undefined
  let coverPath: string | null = null
  let id3Title: string | undefined

  try {
    const metadata = await parseBuffer(new Uint8Array(buffer), { mimeType: file.type })
    id3Title = metadata.common.title
    artist = metadata.common.artist
    album = metadata.common.album
    duration = metadata.format.duration ? Math.round(metadata.format.duration) : undefined
    bitrate = metadata.format.bitrate ? Math.round(metadata.format.bitrate / 1000) : undefined

    if (metadata.common.picture?.[0]) {
      coverPath = await saveCover(metadata.common.picture[0])
    }
  } catch (metaError) {
    console.warn('[Audio Upload] Не удалось извлечь метаданные:', metaError)
  }

  const path = `audio/${filename}`
  const title = customTitle?.trim() || id3Title || titleFromFilename(file.name)
  const slug = await uniqueSlug(title, prisma)

  return prisma.audioFile.create({
    data: {
      title,
      slug,
      filename,
      path,
      mimeType: file.type,
      size: file.size,
      duration,
      artist,
      album,
      coverPath,
      bitrate,
      uploadedById,
    },
  })
}
