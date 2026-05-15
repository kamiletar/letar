import { AVATAR_LIMITS } from '@/app/_constants'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getFileUrl } from '@/lib/images'
import { createFileRecord, deleteFileRecord } from '@/lib/images/create-image.server'
import { deleteOldFile, extractAndValidateFile, generateFilename, saveFileToDisk } from '@/lib/upload'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const UPLOAD_DIR = 'avatars'

/**
 * API endpoint для загрузки аватара пользователя.
 * Сохраняет файл в File и обновляет user.avatarId.
 * Сохраняет обратную совместимость с OAuth аватарами (user.image).
 */
export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    // Извлекаем и валидируем файл
    const { file, error } = await extractAndValidateFile(request, 'file', {
      maxSize: AVATAR_LIMITS.MAX_FILE_SIZE,
      allowedTypes: 'image/',
    })
    if (error) {
      return error
    }

    // Получаем текущего пользователя с аватаром
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarId: true, avatar: true },
    })

    // Удаляем старый загруженный аватар если он есть
    if (user?.avatarId && user?.avatar) {
      await deleteOldFile(user.avatar)
      await deleteFileRecord(user.avatarId).catch(() => undefined)
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
      category: 'AVATAR',
      uploadedById: session.user.id,
      buffer,
    })

    // Обновляем avatarId пользователя
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarId: fileRecord.id },
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
    console.error('[Upload Avatar] Error:', error)
    return NextResponse.json({ error: `Ошибка при загрузке файла: ${errorMessage}` }, { status: 500 })
  }
}

/**
 * API endpoint для удаления аватара пользователя.
 * Удаляет только загруженный аватар (avatarId), не трогает OAuth (image).
 */
export async function DELETE() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarId: true, avatar: true },
    })

    // Удаляем загруженный аватар если есть
    if (user?.avatarId && user?.avatar) {
      await deleteOldFile(user.avatar)
      await deleteFileRecord(user.avatarId).catch(() => undefined)
    }

    // Обнуляем avatarId пользователя
    await prisma.user.update({
      where: { id: session.user.id },
      data: { avatarId: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Delete Avatar] Error:', error)
    return NextResponse.json({ error: 'Ошибка при удалении аватара' }, { status: 500 })
  }
}
