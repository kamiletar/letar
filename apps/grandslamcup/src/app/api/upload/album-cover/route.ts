/**
 * API загрузки обложки альбома.
 * POST: FormData (file, albumId?)
 * Auth: авторизованный поэт (requirePoetAction).
 */

import { prisma } from '@/lib/db'
import { requirePoetAction } from '@/lib/roles'
import { deleteFileFromDisk, ensureUploadDir, extractAndValidateFile, generateFilename } from '@/lib/upload'
import { MAX_UPLOAD_SIZE, resizeImage } from '@/lib/upload/resize-image'
import { writeFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePoetAction()
    if (!auth.success) return NextResponse.json({ error: auth.error }, { status: 401 })

    const result = await extractAndValidateFile(request, 'file', {
      maxSize: MAX_UPLOAD_SIZE,
      allowedTypes: 'image/',
    })
    if (result.error) return result.error

    const { file, formData } = result
    const albumId = formData.get('albumId') as string | null

    // Если albumId передан — проверяем принадлежность и удаляем старую обложку
    if (albumId) {
      const album = await prisma.album.findUnique({
        where: { id: albumId },
        select: { playerId: true, coverImage: true },
      })
      if (!album) return NextResponse.json({ error: 'Альбом не найден' }, { status: 404 })
      if (album.playerId !== auth.poet.playerId) {
        return NextResponse.json({ error: 'Нет прав на редактирование' }, { status: 403 })
      }
      if (album.coverImage) await deleteFileFromDisk(album.coverImage)
    }

    // Ресайз (сохраняет пропорции, макс 1920px)
    const buffer = await resizeImage(Buffer.from(await file.arrayBuffer()))

    const filename = generateFilename(file.name)
    const subdir = albumId ? `albums/${albumId}` : `albums/temp`
    const uploadsDir = await ensureUploadDir(subdir)
    await writeFile(join(uploadsDir, filename), buffer)
    const path = `${subdir}/${filename}`

    // Обновляем coverImage в БД если albumId передан
    if (albumId) {
      await prisma.album.update({
        where: { id: albumId },
        data: { coverImage: path },
      })
    }

    return NextResponse.json({ success: true, path, url: `/api/files/${path}` })
  } catch (error) {
    console.error('[Album Cover Upload] Ошибка:', error)
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 })
  }
}
