'use server'

/**
 * Server actions для организаторов города на публичной странице матча.
 * - Публикация в Telegram: организаторы + админы
 * - Удаление фото: загрузивший фото + организаторы + админы
 */

import { prisma } from '@/lib/db'
import { isOrganizerOfCity } from '@/lib/edit-permissions'
import { sendMatchAnnouncement, sendMatchResult } from '@/lib/telegram'
import type { ActionResult } from '@/lib/types'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import { revalidatePath } from 'next/cache'
import { join } from 'path'

/** Гард: только организатор города матча или ADMIN */
async function organizerGuard(matchId: string): Promise<{ error: ActionResult } | { cityId: string }> {
  const { getSession, getDbUser } = await import('@/lib/auth')
  const session = await getSession()
  if (!session) {
    return { error: { success: false, error: 'Не авторизован' } }
  }

  const user = await getDbUser(session)
  if (user.roles?.includes('ADMIN')) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeam: { select: { team: { select: { cityId: true } } } } },
    })
    return { cityId: match?.homeTeam.team.cityId ?? '' }
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { homeTeam: { select: { team: { select: { cityId: true } } } } },
  })
  if (!match) {
    return { error: { success: false, error: 'Матч не найден' } }
  }

  const cityId = match.homeTeam.team.cityId
  const isOrg = await isOrganizerOfCity(cityId)
  if (!isOrg) {
    return { error: { success: false, error: 'Нет доступа' } }
  }

  return { cityId }
}

/** Опубликовать анонс матча в Telegram-канал города */
export async function publishMatchAnnouncementAction(matchId: string): Promise<ActionResult> {
  const guard = await organizerGuard(matchId)
  if ('error' in guard) return guard.error

  const result = await sendMatchAnnouncement(matchId)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Неизвестная ошибка' }
  }
  return { success: true }
}

/** Опубликовать финальный результат матча в Telegram */
export async function publishMatchResultAction(matchId: string): Promise<ActionResult> {
  const guard = await organizerGuard(matchId)
  if ('error' in guard) return guard.error

  const result = await sendMatchResult(matchId)
  if (!result.success) {
    return { success: false, error: result.error ?? 'Неизвестная ошибка' }
  }
  return { success: true }
}

/**
 * Удалить фото матча.
 * Права: загрузивший фото (uploadedById) + организатор города + ADMIN.
 */
export async function deleteMatchPhotoAction(photoId: string, citySlug: string): Promise<ActionResult> {
  const { getSession, getDbUser } = await import('@/lib/auth')
  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Не авторизован' }
  }
  const user = await getDbUser(session)

  const photo = await prisma.matchPhoto.findUnique({
    where: { id: photoId },
    select: {
      id: true,
      path: true,
      matchId: true,
      uploadedById: true,
      match: { select: { homeTeam: { select: { team: { select: { cityId: true } } } } } },
    },
  })

  if (!photo) {
    return { success: false, error: 'Фото не найдено' }
  }

  const isAdmin = user.roles?.includes('ADMIN')
  const isUploader = photo.uploadedById === user.id
  const isOrg = !isAdmin && !isUploader
    ? await isOrganizerOfCity(photo.match.homeTeam.team.cityId)
    : false

  if (!isAdmin && !isUploader && !isOrg) {
    return { success: false, error: 'Нет доступа' }
  }

  // Удаляем файл с диска
  const filepath = join(process.cwd(), 'uploads', photo.path)
  if (existsSync(filepath)) {
    await unlink(filepath)
  }

  await prisma.matchPhoto.delete({ where: { id: photoId } })

  revalidatePath(`/${citySlug}/matches/${photo.matchId}`)
  return { success: true }
}
