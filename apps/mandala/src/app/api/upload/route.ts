import type { ImageCategory } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { createImageRecord, deleteImageByPath, getImageById, getImageUrl } from '@/lib/images/create-image'
import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации
    const session = await getSession()

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав для загрузки файлов' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const category = (formData.get('category') as ImageCategory) || 'OTHER'

    if (!file) {
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 })
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: `Файл должен быть изображением (получен: ${file.type})` }, { status: 400 })
    }

    // Проверка размера файла (максимум 32MB)
    const maxSize = 32 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Размер файла не должен превышать 32MB (файл: ${(file.size / 1024 / 1024).toFixed(2)} MB)` },
        { status: 400 }
      )
    }

    // Генерация уникального имени файла
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`

    // Определяем папку по категории
    const categoryFolder = category.toLowerCase()

    // Путь для сохранения файла (вне public, чтобы работало в production)
    const uploadsDir = join(process.cwd(), 'uploads', categoryFolder)

    // Создаем директорию, если она не существует
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filepath = join(uploadsDir, filename)

    // Конвертируем файл в Buffer и сохраняем
    const bytes = await file.arrayBuffer()
    let buffer: Buffer | null = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Относительный путь для хранения в БД
    const path = `${categoryFolder}/${filename}`

    // Создаём запись в таблице Image
    const image = await createImageRecord({
      filename,
      path,
      mimeType: file.type,
      size: file.size,
      category,
      uploadedById: session.user.id,
      buffer,
    })

    // Освобождаем память — buffer больше не нужен
    buffer = null

    // Формируем URL для доступа к файлу
    const url = getImageUrl(path)

    return NextResponse.json({
      success: true,
      id: image.id,
      url,
      filename,
      width: image.width,
      height: image.height,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: `Ошибка при загрузке файла: ${errorMessage}` }, { status: 500 })
  }
}

// Endpoint для удаления файлов
export async function DELETE(request: NextRequest) {
  try {
    // Проверка авторизации
    const session = await getSession()
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Недостаточно прав для удаления файлов' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')
    const imageId = searchParams.get('id')

    // Удаление по ID (новый способ)
    if (imageId) {
      const image = await getImageById(imageId)

      if (!image) {
        return NextResponse.json({ error: 'Изображение не найдено' }, { status: 404 })
      }

      // Удаляем файл с диска
      const filepath = join(process.cwd(), 'uploads', image.path)
      if (existsSync(filepath)) {
        await unlink(filepath)
      }

      // Удаляем запись из БД
      const { deleteImageRecord } = await import('@/lib/images/create-image')
      await deleteImageRecord(imageId)

      return NextResponse.json({ success: true })
    }

    // Удаление по URL (обратная совместимость)
    if (!url || !url.startsWith('/api/files/')) {
      return NextResponse.json({ error: 'Некорректный URL или ID' }, { status: 400 })
    }

    // Извлекаем путь из URL
    const path = url.replace('/api/files/', '')
    const filepath = join(process.cwd(), 'uploads', path)

    // Удаляем файл
    if (existsSync(filepath)) {
      await unlink(filepath)
    }

    // Пытаемся удалить запись из БД (если существует)
    try {
      await deleteImageByPath(path)
    } catch {
      // Игнорируем ошибку если записи нет (для обратной совместимости)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json({ error: 'Ошибка при удалении файла' }, { status: 500 })
  }
}
