/**
 * POST /api/upload/user-avatar — загрузка аватара пользователя.
 * Auth: любой авторизованный пользователь (только свой аватар).
 */

import { prisma } from '@/lib/db'
import { deleteFileFromDisk, ensureUploadDir, extractAndValidateFile, generateFilename } from '@/lib/upload'
import { MAX_UPLOAD_SIZE, resizeAvatar } from '@/lib/upload/resize-image'
import { writeFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const { getSession } = await import('@/lib/auth')
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const result = await extractAndValidateFile(request, 'file', {
      maxSize: MAX_UPLOAD_SIZE,
      allowedTypes: 'image/',
    })
    if (result.error) {
      return result.error
    }

    const { file } = result
    const userId = session.user.id

    // Удаляем старый аватар если был локальным файлом
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    })
    if (currentUser?.image && !currentUser.image.startsWith('http')) {
      await deleteFileFromDisk(currentUser.image)
    }

    // Ресайз аватара (квадратный кроп 400x400)
    const filename = generateFilename(file.name)
    const buffer = await resizeAvatar(Buffer.from(await file.arrayBuffer()))
    const subdir = `users/${userId}`
    const uploadsDir = await ensureUploadDir(subdir)
    await writeFile(join(uploadsDir, filename), buffer)
    const path = `${subdir}/${filename}`
    await prisma.user.update({ where: { id: userId }, data: { image: path } })

    return NextResponse.json({ success: true, url: `/api/files/${path}` })
  } catch (error) {
    console.error('[User Avatar Upload] Error:', error)
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 })
  }
}
