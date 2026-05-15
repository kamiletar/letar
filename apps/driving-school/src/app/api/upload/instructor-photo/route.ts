import { INSTRUCTOR_PHOTO_LIMITS } from '@/app/_constants'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getFileUrl } from '@/lib/images'
import { createFileRecord, deleteFileRecord } from '@/lib/images/create-image.server'
import { deleteOldFile, extractAndValidateFile, generateFilename, saveFileToDisk } from '@/lib/upload'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const UPLOAD_DIR = 'instructor-photos'

/**
 * API endpoint для загрузки фото инструктора (как в паспорте).
 * Сохраняет файл в File и обновляет instructorProfile.photoId.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    // Проверяем что пользователь - инструктор
    const instructorProfile = await prisma.instructorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, photoId: true, photo: true },
    })

    if (!instructorProfile) {
      return NextResponse.json({ error: 'Профиль инструктора не найден' }, { status: 404 })
    }

    // Извлекаем и валидируем файл
    const { file, error } = await extractAndValidateFile(request, 'file', {
      maxSize: INSTRUCTOR_PHOTO_LIMITS.MAX_FILE_SIZE,
      allowedTypes: 'image/',
    })
    if (error) {
      return error
    }

    // Удаляем старое фото если есть
    if (instructorProfile.photoId && instructorProfile.photo) {
      await deleteOldFile(instructorProfile.photo)
      await deleteFileRecord(instructorProfile.photoId).catch(() => undefined)
    }

    // Сохраняем файл на диск
    const filename = generateFilename(file.name)
    const { path, buffer } = await saveFileToDisk(file, UPLOAD_DIR, filename)

    // Создаём запись в таблице File
    const fileRecord = await createFileRecord({
      filename,
      path,
      mimeType: file.type,
      size: file.size,
      category: 'INSTRUCTOR_PHOTO',
      uploadedById: session.user.id,
      buffer,
    })

    // Обновляем photoId профиля инструктора
    await prisma.instructorProfile.update({
      where: { id: instructorProfile.id },
      data: { photoId: fileRecord.id },
    })

    return NextResponse.json({
      success: true,
      id: fileRecord.id,
      url: getFileUrl(path),
      filename,
      width: fileRecord.width,
      height: fileRecord.height,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    console.error('[Upload Instructor Photo] Error:', error)
    return NextResponse.json({ error: `Ошибка при загрузке файла: ${errorMessage}` }, { status: 500 })
  }
}

/**
 * API endpoint для удаления фото инструктора.
 */
export async function DELETE() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const instructorProfile = await prisma.instructorProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, photoId: true, photo: true },
    })

    if (!instructorProfile) {
      return NextResponse.json({ error: 'Профиль инструктора не найден' }, { status: 404 })
    }

    if (instructorProfile.photoId && instructorProfile.photo) {
      await deleteOldFile(instructorProfile.photo)
      await deleteFileRecord(instructorProfile.photoId).catch(() => undefined)
    }

    await prisma.instructorProfile.update({
      where: { id: instructorProfile.id },
      data: { photoId: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Delete Instructor Photo] Error:', error)
    return NextResponse.json({ error: 'Ошибка при удалении фото' }, { status: 500 })
  }
}
