import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { saveUploadedFile } from '@/lib/files/save-uploaded-file'
import { deleteFileFromDisk, extractAndValidateFile } from '@letar/upload-validation'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

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

    const { file, formData, error } = await extractAndValidateFile(request, 'file', { maxSize: MAX_SIZE })
    if (error) {
      return error
    }
    const description = formData.get('description') as string | null

    const uploaded = await saveUploadedFile(file, session.user.id, { description })

    return NextResponse.json({
      success: true,
      id: uploaded.id,
      url: `/api/files/${uploaded.path}`,
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

    await deleteFileFromDisk(record.path)

    await prisma.uploadedFile.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ArbitraryUpload] Delete error:', error)
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 })
  }
}
