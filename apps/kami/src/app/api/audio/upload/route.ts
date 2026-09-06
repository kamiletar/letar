import { saveAudioFile } from '@/lib/audio/save-audio-file'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { deleteFileFromDisk, extractAndValidateFile } from '@letar/upload-validation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/** Допустимые MIME-типы для аудио */
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/m4a']

/** Максимальный размер файла — 100MB */
const MAX_SIZE = 100 * 1024 * 1024

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

    const audioFile = await saveAudioFile(file, session.user.id, customTitle)

    return NextResponse.json({
      success: true,
      id: audioFile.id,
      slug: audioFile.slug,
      url: `/api/files/${audioFile.path}`,
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
