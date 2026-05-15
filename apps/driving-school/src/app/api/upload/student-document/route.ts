/**
 * API endpoint для загрузки документов ученика (v0.204.0)
 *
 * POST — загрузка файла документа
 * DELETE — удаление файла документа
 */

import { getSession } from '@/lib/auth'
import { getFileUrl } from '@/lib/images'
import { createFileRecord, deleteFileRecord, getFileById } from '@/lib/images/create-image.server'
import type { StudentDocumentType } from '@letar/driving-school-db/prisma'
import { PrismaClient } from '@letar/driving-school-db/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] ?? '' })
const prisma = new PrismaClient({ adapter })

// Допустимые MIME-типы для документов
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

// Максимальный размер файла — 15MB
const MAX_FILE_SIZE = 15 * 1024 * 1024

// Проверка, является ли пользователь менеджером школы
async function isSchoolManager(userId: string, organizationId: string): Promise<boolean> {
  const membership = await prisma.member.findFirst({
    where: {
      userId,
      organizationId,
      role: { in: ['owner', 'super_manager', 'manager'] },
    },
  })
  return !!membership
}

// Проверка, является ли пользователь владельцем прогресса
async function isProgressOwner(userId: string, progressId: string): Promise<boolean> {
  const progress = await prisma.studentProgress.findFirst({
    where: {
      id: progressId,
      userId,
    },
  })
  return !!progress
}

/**
 * POST /api/upload/student-document
 * Загружает файл документа студента
 *
 * FormData:
 * - file: File
 * - progressId: string
 * - documentType: StudentDocumentType
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
    const progressId = formData.get('progressId') as string
    const documentType = formData.get('documentType') as StudentDocumentType

    // Валидация обязательных полей
    if (!file) {
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 })
    }

    if (!progressId) {
      return NextResponse.json({ error: 'progressId не указан' }, { status: 400 })
    }

    if (!documentType) {
      return NextResponse.json({ error: 'documentType не указан' }, { status: 400 })
    }

    // Получаем прогресс для проверки прав
    const progress = await prisma.studentProgress.findUnique({
      where: { id: progressId },
      select: { id: true, organizationId: true, userId: true },
    })

    if (!progress) {
      return NextResponse.json({ error: 'Прогресс не найден' }, { status: 404 })
    }

    // Проверка прав: либо менеджер школы, либо владелец прогресса
    const canUpload =
      (await isSchoolManager(session.user.id, progress.organizationId)) ||
      (await isProgressOwner(session.user.id, progressId))

    if (!canUpload) {
      return NextResponse.json({ error: 'Нет прав на загрузку документа' }, { status: 403 })
    }

    // Проверка типа файла
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Неподдерживаемый тип файла: ${file.type}. Допустимы: JPEG, PNG, WebP, PDF` },
        { status: 400 }
      )
    }

    // Проверка размера файла
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Размер файла не должен превышать 15MB (файл: ${(file.size / 1024 / 1024).toFixed(2)} MB)` },
        { status: 400 }
      )
    }

    // Генерация уникального имени файла
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
    const filename = `${timestamp}-${randomString}.${extension}`

    // Путь для сохранения файла
    const uploadsDir = join(process.cwd(), 'uploads', 'student-documents', progressId)

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
    const path = `student-documents/${progressId}/${filename}`

    // Создаём запись в таблице File
    const fileRecord = await createFileRecord({
      filename,
      path,
      mimeType: file.type,
      size: file.size,
      category: 'DOCUMENT',
      uploadedById: session.user.id,
      buffer: file.type.startsWith('image/') ? buffer : undefined, // Размеры только для изображений
    })

    // Формируем URL для доступа к файлу
    const url = getFileUrl(path)

    return NextResponse.json({
      success: true,
      fileId: fileRecord.id,
      url,
      filename,
      mimeType: file.type,
      size: file.size,
      width: fileRecord.width,
      height: fileRecord.height,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    console.error('[Upload Student Document] Error:', error)
    return NextResponse.json({ error: `Ошибка при загрузке файла: ${errorMessage}` }, { status: 500 })
  }
}

/**
 * DELETE /api/upload/student-document
 * Удаляет файл документа студента
 *
 * Query params:
 * - fileId: string
 */
export async function DELETE(request: NextRequest) {
  try {
    // Проверка авторизации
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'fileId не указан' }, { status: 400 })
    }

    // Получаем файл
    const fileRecord = await getFileById(fileId)

    if (!fileRecord) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    // Проверяем, связан ли файл с документом студента
    const studentDocument = await prisma.studentDocument.findFirst({
      where: { fileId },
      include: {
        progress: {
          select: { organizationId: true, userId: true },
        },
      },
    })

    if (!studentDocument) {
      return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
    }

    // Проверка прав: либо менеджер школы, либо владелец прогресса
    const canDelete =
      (await isSchoolManager(session.user.id, studentDocument.progress.organizationId)) ||
      studentDocument.progress.userId === session.user.id

    if (!canDelete) {
      return NextResponse.json({ error: 'Нет прав на удаление документа' }, { status: 403 })
    }

    // Нельзя удалять одобренные документы
    if (studentDocument.status === 'APPROVED') {
      return NextResponse.json({ error: 'Нельзя удалить одобренный документ' }, { status: 400 })
    }

    // Удаляем файл с диска
    const filepath = join(process.cwd(), 'uploads', fileRecord.path)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }

    // Удаляем документ студента
    await prisma.studentDocument.delete({
      where: { id: studentDocument.id },
    })

    // Удаляем запись File
    await deleteFileRecord(fileId)

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
    console.error('[Delete Student Document] Error:', error)
    return NextResponse.json({ error: `Ошибка при удалении файла: ${errorMessage}` }, { status: 500 })
  }
}
