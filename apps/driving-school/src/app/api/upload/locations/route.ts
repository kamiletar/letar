import { getSession } from '@/lib/auth'
import { getFileUrl } from '@/lib/images'
import { createFileRecord, deleteFileRecord, getFileById } from '@/lib/images/create-image.server'
import { PrismaClient } from '@letar/driving-school-db/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma = new PrismaClient({ adapter })

/**
 * API endpoint для загрузки фотографий филиалов.
 * Создаёт запись в File и связь в LocationFile.
 */
export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const locationId = formData.get('locationId') as string

    if (!file) {
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 })
    }

    if (!locationId) {
      return NextResponse.json({ error: 'locationId не указан' }, { status: 400 })
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: `Файл должен быть изображением (получен: ${file.type})` }, { status: 400 })
    }

    // Проверка размера файла (максимум 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Размер файла не должен превышать 10MB (файл: ${(file.size / 1024 / 1024).toFixed(2)} MB)` },
        { status: 400 }
      )
    }

    // Проверка существования филиала
    const location = await prisma.team.findUnique({
      where: { id: locationId },
      include: { files: true },
    })

    if (!location) {
      return NextResponse.json({ error: 'Филиал не найден' }, { status: 404 })
    }

    // Генерация уникального имени файла
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`

    // Путь для сохранения файла
    const uploadsDir = join(process.cwd(), 'uploads', 'locations')

    // Создаем директорию, если она не существует
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const filepath = join(uploadsDir, filename)

    // Конвертируем файл в Buffer и сохраняем
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Относительный путь для хранения в БД
    const path = `locations/${filename}`

    // Создаём запись в таблице File
    const fileRecord = await createFileRecord({
      filename,
      path,
      mimeType: file.type,
      size: file.size,
      category: 'LOCATION',
      uploadedById: session.user.id,
      buffer,
    })

    // Вычисляем следующий порядок
    const maxOrder = location.files.reduce((max: number, f: { order: number }) => Math.max(max, f.order), -1)

    // Создаём связь LocationFile
    const locationFile = await prisma.locationFile.create({
      data: {
        teamId: locationId,
        fileId: fileRecord.id,
        order: maxOrder + 1,
      },
      include: {
        file: true,
      },
    })

    // Формируем URL для доступа к файлу
    const url = getFileUrl(path)

    return NextResponse.json({
      success: true,
      id: locationFile.id,
      fileId: fileRecord.id,
      url,
      filename,
      width: fileRecord.width,
      height: fileRecord.height,
      order: locationFile.order,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    console.error('[Upload Location File] Error:', error)
    return NextResponse.json({ error: `Ошибка при загрузке файла: ${errorMessage}` }, { status: 500 })
  }
}

/**
 * API endpoint для удаления фотографий филиалов.
 * Удаляет файл, запись File и связь LocationFile.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Проверка авторизации
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId') || searchParams.get('imageId') // поддержка старого параметра
    const locationFileId = searchParams.get('id')

    // Удаление по locationFileId
    if (locationFileId) {
      const locationFile = await prisma.locationFile.findUnique({
        where: { id: locationFileId },
        include: { file: true },
      })

      if (!locationFile) {
        return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
      }

      // Удаляем файл с диска
      const filepath = join(process.cwd(), 'uploads', locationFile.file.path)
      if (existsSync(filepath)) {
        await unlink(filepath)
      }

      // Удаляем связь LocationFile
      await prisma.locationFile.delete({
        where: { id: locationFileId },
      })

      // Удаляем File
      await deleteFileRecord(locationFile.fileId)

      return NextResponse.json({ success: true })
    }

    // Удаление по fileId
    if (fileId) {
      const fileRecord = await getFileById(fileId)

      if (!fileRecord) {
        return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
      }

      // Удаляем файл с диска
      const filepath = join(process.cwd(), 'uploads', fileRecord.path)
      if (existsSync(filepath)) {
        await unlink(filepath)
      }

      // Удаляем связи LocationFile
      await prisma.locationFile.deleteMany({
        where: { fileId },
      })

      // Удаляем File
      await deleteFileRecord(fileId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Не указан id или fileId' }, { status: 400 })
  } catch (error) {
    console.error('[Delete Location File] Error:', error)
    return NextResponse.json({ error: 'Ошибка при удалении файла' }, { status: 500 })
  }
}

/**
 * API endpoint для обновления порядка файлов.
 */
export async function PATCH(request: NextRequest) {
  try {
    // Проверка авторизации
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const body = await request.json()
    // Поддержка старого параметра 'images' для обратной совместимости
    const files =
      (body as { files?: Array<{ id: string; order: number }>; images?: Array<{ id: string; order: number }> }).files ||
      (body as { images?: Array<{ id: string; order: number }> }).images

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'files должен быть массивом' }, { status: 400 })
    }

    // Обновляем порядок всех файлов
    await Promise.all(
      files.map(({ id, order }) =>
        prisma.locationFile.update({
          where: { id },
          data: { order },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Reorder Location Files] Error:', error)
    return NextResponse.json({ error: 'Ошибка при изменении порядка' }, { status: 500 })
  }
}
