'use server'

/**
 * Server actions для управления фотографиями матчей
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import { revalidatePath } from 'next/cache'
import { join } from 'path'
import { z } from 'zod/v4'

// === Удалить фото ===

export const deletePhotoAction = adminGuard(async (photoId: string) => {
  try {
    const photo = await prisma.matchPhoto.findUnique({
      where: { id: photoId },
      select: { id: true, path: true, matchId: true },
    })

    if (!photo) {
      return { error: 'Фото не найдено' }
    }

    // Удаляем файл с диска
    const filepath = join(process.cwd(), 'uploads', photo.path)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }

    // Удаляем запись
    await prisma.matchPhoto.delete({ where: { id: photoId } })

    revalidatePath(`/admin/matches/${photo.matchId}/photos`)
    revalidatePath(`/matches/${photo.matchId}`)
    return { success: true }
  } catch (error) {
    console.error('[deletePhotoAction] ошибка:', error)
    return { error: 'Не удалось удалить фото' }
  }
})

// === Обновить подпись ===

const CaptionSchema = z
  .object({
    photoId: z.string().min(1),
    caption: z.string().max(500),
  })
  .strip()

export const updatePhotoCaptionAction = adminGuard(async (input: unknown) => {
  const parsed = CaptionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  try {
    const photo = await prisma.matchPhoto.findUnique({
      where: { id: parsed.data.photoId },
      select: { matchId: true },
    })

    if (!photo) {
      return { error: 'Фото не найдено' }
    }

    await prisma.matchPhoto.update({
      where: { id: parsed.data.photoId },
      data: { caption: parsed.data.caption || null },
    })

    revalidatePath(`/admin/matches/${photo.matchId}/photos`)
    revalidatePath(`/matches/${photo.matchId}`)
    return { success: true }
  } catch (error) {
    console.error('[updatePhotoCaptionAction] ошибка:', error)
    return { error: 'Не удалось обновить подпись' }
  }
})
