import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { existsSync } from 'fs'
import { mkdir, unlink, writeFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

/** Максимальный размер файла — 500MB */
const MAX_SIZE = 500 * 1024 * 1024

/**
 * POST /api/arbitrary-upload — загрузка файла любого формата (только admin)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user || !session.user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = (formData.get('description') as string | null)?.trim() || null

    if (!file) {
      return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Максимальный размер — 500MB (файл: ${(file.size / 1024 / 1024).toFixed(1)} MB)` },
        { status: 400 },
      )
    }

    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : ''
    const storedName = extension ? `${timestamp}-${randomString}.${extension}` : `${timestamp}-${randomString}`

    const uploadsDir = join(process.cwd(), 'uploads', 'files')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const bytes = await file.arrayBuffer()
    await writeFile(join(uploadsDir, storedName), Buffer.from(bytes))

    const path = `files/${storedName}`

    const uploaded = await prisma.uploadedFile.create({
      data: {
        filename: file.name,
        storedName,
        path,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        description,
        uploadedById: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      id: uploaded.id,
      url: `/api/files/${path}`,
      filename: uploaded.filename,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка'
    console.error('[ArbitraryUpload] Error:', msg)
    return NextResponse.json({ error: `Ошибка загрузки: ${msg}` }, { status: 500 })
  }
}

/**
 * DELETE /api/arbitrary-upload?id=xxx — удаление файла (только admin)
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

    const record = await prisma.uploadedFile.findUnique({ where: { id } })
    if (!record) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    const filepath = join(process.cwd(), 'uploads', record.path)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }

    await prisma.uploadedFile.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ArbitraryUpload] Delete error:', error)
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}
