import { getSession } from '@/lib/auth'
import { getFileUrl } from '@/lib/images'
import { createFileRecord, deleteFileRecord, getFileById } from '@/lib/images/create-image.server'
import { isInstructor } from '@/lib/roles'
import { PrismaClient } from '@letar/driving-school-db/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

import { VEHICLE_PHOTO_LIMITS } from '@/app/_constants'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma = new PrismaClient({ adapter })

const MAX_PHOTOS_PER_VEHICLE = VEHICLE_PHOTO_LIMITS.MAX_PHOTOS

/**
 * API endpoint для загрузки фотографий автомобилей.
 * Создаёт запись в File и связь в VehicleFile.
 */
export async function POST(request: NextRequest) {
  try {
    // Проверка авторизации
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    if (!isInstructor(session.user.roles)) {
      return NextResponse.json({ error: 'Только для инструкторов' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const vehicleId = formData.get('vehicleId') as string

    if (!file) {
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 })
    }

    if (!vehicleId) {
      return NextResponse.json({ error: 'vehicleId не указан' }, { status: 400 })
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

    // Получаем профиль инструктора
    const instructorProfile = await prisma.instructorProfile.findFirst({
      where: { userId: session.user.id },
    })

    if (!instructorProfile) {
      return NextResponse.json({ error: 'Профиль инструктора не найден' }, { status: 404 })
    }

    // Проверка существования автомобиля и принадлежности инструктору
    const vehicle = await prisma.instructorVehicle.findFirst({
      where: {
        id: vehicleId,
        instructorProfileId: instructorProfile.id,
      },
      include: { files: true },
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Автомобиль не найден' }, { status: 404 })
    }

    // Проверка лимита фотографий
    if (vehicle.files.length >= MAX_PHOTOS_PER_VEHICLE) {
      return NextResponse.json({ error: `Максимум ${MAX_PHOTOS_PER_VEHICLE} фото на автомобиль` }, { status: 400 })
    }

    // Генерация уникального имени файла
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`

    // Путь для сохранения файла
    const uploadsDir = join(process.cwd(), 'uploads', 'vehicles')

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
    const path = `vehicles/${filename}`

    // Создаём запись в таблице File
    const fileRecord = await createFileRecord({
      filename,
      path,
      mimeType: file.type,
      size: file.size,
      category: 'VEHICLE',
      uploadedById: session.user.id,
      buffer,
    })

    // Вычисляем следующий порядок
    const maxOrder = vehicle.files.reduce((max, f) => Math.max(max, f.order), -1)

    // Создаём связь VehicleFile
    const vehicleFile = await prisma.vehicleFile.create({
      data: {
        vehicleId,
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
      id: vehicleFile.id,
      fileId: fileRecord.id,
      url,
      filename,
      width: fileRecord.width,
      height: fileRecord.height,
      order: vehicleFile.order,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    console.error('[Upload Vehicle File] Error:', error)
    return NextResponse.json({ error: `Ошибка при загрузке файла: ${errorMessage}` }, { status: 500 })
  }
}

/**
 * API endpoint для удаления фотографий автомобилей.
 * Удаляет файл, запись File и связь VehicleFile.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Проверка авторизации
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    if (!isInstructor(session.user.roles)) {
      return NextResponse.json({ error: 'Только для инструкторов' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')
    const vehicleFileId = searchParams.get('id')

    // Получаем профиль инструктора для проверки прав
    const instructorProfile = await prisma.instructorProfile.findFirst({
      where: { userId: session.user.id },
    })

    if (!instructorProfile) {
      return NextResponse.json({ error: 'Профиль инструктора не найден' }, { status: 404 })
    }

    // Удаление по vehicleFileId
    if (vehicleFileId) {
      const vehicleFile = await prisma.vehicleFile.findUnique({
        where: { id: vehicleFileId },
        include: {
          file: true,
          vehicle: true,
        },
      })

      if (!vehicleFile) {
        return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
      }

      // Проверяем, что автомобиль принадлежит текущему инструктору
      if (vehicleFile.vehicle.instructorProfileId !== instructorProfile.id) {
        return NextResponse.json({ error: 'Нет прав на удаление' }, { status: 403 })
      }

      // Удаляем файл с диска
      const filepath = join(process.cwd(), 'uploads', vehicleFile.file.path)
      if (existsSync(filepath)) {
        await unlink(filepath)
      }

      // Удаляем связь VehicleFile
      await prisma.vehicleFile.delete({
        where: { id: vehicleFileId },
      })

      // Удаляем File
      await deleteFileRecord(vehicleFile.fileId)

      return NextResponse.json({ success: true })
    }

    // Удаление по fileId
    if (fileId) {
      const fileRecord = await getFileById(fileId)

      if (!fileRecord) {
        return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
      }

      // Проверяем, что файл связан с автомобилем текущего инструктора
      const vehicleFile = await prisma.vehicleFile.findFirst({
        where: { fileId },
        include: { vehicle: true },
      })

      if (vehicleFile && vehicleFile.vehicle.instructorProfileId !== instructorProfile.id) {
        return NextResponse.json({ error: 'Нет прав на удаление' }, { status: 403 })
      }

      // Удаляем файл с диска
      const filepath = join(process.cwd(), 'uploads', fileRecord.path)
      if (existsSync(filepath)) {
        await unlink(filepath)
      }

      // Удаляем связи VehicleFile
      await prisma.vehicleFile.deleteMany({
        where: { fileId },
      })

      // Удаляем File
      await deleteFileRecord(fileId)

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Не указан id или fileId' }, { status: 400 })
  } catch (error) {
    console.error('[Delete Vehicle File] Error:', error)
    return NextResponse.json({ error: 'Ошибка при удалении файла' }, { status: 500 })
  }
}

/**
 * API endpoint для обновления порядка фотографий.
 */
export async function PATCH(request: NextRequest) {
  try {
    // Проверка авторизации
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    if (!isInstructor(session.user.roles)) {
      return NextResponse.json({ error: 'Только для инструкторов' }, { status: 403 })
    }

    const body = await request.json()
    const files = (body as { files?: Array<{ id: string; order: number }> }).files

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: 'files должен быть массивом' }, { status: 400 })
    }

    // Обновляем порядок всех файлов
    await Promise.all(
      files.map(({ id, order }) =>
        prisma.vehicleFile.update({
          where: { id },
          data: { order },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Reorder Vehicle Files] Error:', error)
    return NextResponse.json({ error: 'Ошибка при изменении порядка' }, { status: 500 })
  }
}
