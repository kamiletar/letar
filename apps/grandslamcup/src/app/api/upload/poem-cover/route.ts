/**
 * API загрузки обложки стихотворения.
 * POST: FormData (file, poemId?)
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
    const poemId = formData.get('poemId') as string | null

    // Если poemId передан — проверяем принадлежность и удаляем старую обложку
    if (poemId) {
      const poem = await prisma.poem.findUnique({
        where: { id: poemId },
        select: { playerId: true, coverImage: true },
      })
      if (!poem) return NextResponse.json({ error: 'Стихотворение не найдено' }, { status: 404 })
      if (poem.playerId !== auth.poet.playerId) {
        return NextResponse.json({ error: 'Нет прав на редактирование' }, { status: 403 })
      }
      if (poem.coverImage) await deleteFileFromDisk(poem.coverImage)
    }

    // Ресайз (сохраняет пропорции, макс 1920px)
    const buffer = await resizeImage(Buffer.from(await file.arrayBuffer()))

    const filename = generateFilename(file.name)
    const subdir = poemId ? `poems/${poemId}` : `poems/temp`
    const uploadsDir = await ensureUploadDir(subdir)
    await writeFile(join(uploadsDir, filename), buffer)
    const path = `${subdir}/${filename}`

    // Обновляем coverImage в БД если poemId передан
    if (poemId) {
      await prisma.poem.update({
        where: { id: poemId },
        data: { coverImage: path },
      })
    }

    return NextResponse.json({ success: true, path, url: `/api/files/${path}` })
  } catch (error) {
    console.error('[Poem Cover Upload] Ошибка:', error)
    return NextResponse.json({ error: 'Ошибка загрузки' }, { status: 500 })
  }
}
