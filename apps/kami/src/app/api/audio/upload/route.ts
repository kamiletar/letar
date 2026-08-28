import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uniqueSlug } from '@/lib/utils/slugify'
import { deleteFileFromDisk, extractAndValidateFile, generateFilename, saveFileToDisk } from '@letar/upload-validation'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { parseBuffer } from 'music-metadata'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

/** Допустимые MIME-типы для аудио */
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/m4a']

/** Максимальный размер файла — 100MB */
const MAX_SIZE = 100 * 1024 * 1024

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

/**
 * POST /api/audio/upload — загрузка аудиофайла (только admin)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !session.user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { file, formData, error } = await extractAndValidateFile(request, 'file', {
      maxSize: MAX_SIZE,
      allowedTypes: ALLOWED_AUDIO_TYPES,
    })
    if (error) {
      return error
    }
    const customTitle = formData.get('title') as string | null

    // Генерация уникального имени файла и сохранение на диск
    const filename = generateFilename(file.name)
    const { buffer } = await saveFileToDisk(file, 'audio', filename)

    // Парсим ID3 метаданные
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

      // Сохраняем обложку если есть
      if (metadata.common.picture?.[0]) {
        coverPath = await saveCover(metadata.common.picture[0])
      }
    } catch (metaError) {
      console.warn('[Audio Upload] Не удалось извлечь метаданные:', metaError)
    }

    const path = `audio/${filename}`
    // Приоритет: пользовательский title > ID3 title > имя файла
    const title = customTitle?.trim() || id3Title || titleFromFilename(file.name)
    const slug = await uniqueSlug(title, prisma)

    // Создаём запись в БД
    const audioFile = await prisma.audioFile.create({
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
        uploadedById: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      id: audioFile.id,
      slug: audioFile.slug,
      url: `/api/files/${path}`,
      title: audioFile.title,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка'
    console.error('[Audio Upload] Error:', msg)
    return NextResponse.json({ error: `Ошибка загрузки: ${msg}` }, { status: 500 })
  }
}

/**
 * DELETE /api/audio/upload?id=xxx — удаление аудиофайла (только admin)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !session.user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Не указан ID' }, { status: 400 })
    }

    const audioFile = await prisma.audioFile.findUnique({ where: { id } })
    if (!audioFile) {
      return NextResponse.json({ error: 'Аудиофайл не найден' }, { status: 404 })
    }

    // Удаляем файл с диска
    await deleteFileFromDisk(audioFile.path)

    // Удаляем обложку если есть
    if (audioFile.coverPath) {
      await deleteFileFromDisk(audioFile.coverPath)
    }

    // Удаляем запись из БД
    await prisma.audioFile.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Audio Upload] Delete error:', error)
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}
