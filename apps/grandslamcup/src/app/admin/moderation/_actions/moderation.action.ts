'use server'

/**
 * Server actions для модерации заявок.
 *
 * Одобрение:
 * - NEW_PLAYER → создаёт Player + PlayerTeamSeason
 * - TRANSFER → создаёт Transfer + обновляет старый PTS (leftAt) + создаёт новый PTS
 *
 * Отклонение → обновляет статус + moderatorNote.
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { requireAdminAction } from '@/lib/roles'
import { transliterate } from '@/lib/transliterate'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Список заявок ===

export const getApplicationsAction = adminGuard(async (status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL') => {
  const applications = await prisma.rosterApplication.findMany({
    where: status && status !== 'ALL' ? { status } : undefined,
    include: {
      player: { select: { id: true, name: true, slug: true } },
      fromTeamSeason: {
        include: { team: { select: { id: true, name: true } } },
      },
      toTeamSeason: {
        include: {
          team: { select: { id: true, name: true } },
          season: { select: { id: true, name: true } },
        },
      },
      submittedBy: { select: { id: true, name: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return { data: applications }
})

// === Одобрить заявку ===

const ApproveSchema = z
  .object({
    id: z.string().min(1),
    moderatorNote: z.string().max(500).optional(),
  })
  .strip()

export async function approveApplicationAction(input: unknown) {
  const auth = await requireAdminAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = ApproveSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const app = await prisma.rosterApplication.findUnique({
    where: { id: parsed.data.id },
    include: {
      toTeamSeason: { select: { seasonId: true } },
    },
  })

  if (!app) {
    return { error: 'Заявка не найдена' }
  }
  if (app.status !== 'PENDING') {
    return { error: 'Заявка уже рассмотрена' }
  }

  try {
    if (app.type === 'NEW_PLAYER') {
      // Создаём нового игрока и привязку к команде
      const slug = transliterate(app.playerName ?? 'player')

      // Проверяем уникальность slug
      let finalSlug = slug
      const existing = await prisma.player.findUnique({ where: { slug } })
      if (existing) {
        finalSlug = `${slug}-${Date.now().toString(36)}`
      }

      const player = await prisma.player.create({
        data: {
          name: app.playerName ?? 'Без имени',
          slug: finalSlug,
          bio: app.playerBio,
          telegramLink: app.playerTelegram,
          vkLink: app.playerVk,
        },
      })

      await prisma.playerTeamSeason.create({
        data: {
          playerId: player.id,
          teamSeasonId: app.toTeamSeasonId,
          role: app.role,
        },
      })

      // Обновляем статус заявки
      await prisma.rosterApplication.update({
        where: { id: app.id },
        data: {
          status: 'APPROVED',
          playerId: player.id,
          moderatorNote: parsed.data.moderatorNote || null,
          reviewedById: auth.user.id,
          reviewedAt: new Date(),
        },
      })
    } else if (app.type === 'TRANSFER') {
      if (!app.playerId || !app.fromTeamSeasonId) {
        return { error: 'Недостаточно данных для трансфера' }
      }

      // Закрываем старое членство
      await prisma.playerTeamSeason.updateMany({
        where: {
          playerId: app.playerId,
          teamSeasonId: app.fromTeamSeasonId,
          leftAt: null,
        },
        data: { leftAt: new Date() },
      })

      // Создаём новое членство
      await prisma.playerTeamSeason.create({
        data: {
          playerId: app.playerId,
          teamSeasonId: app.toTeamSeasonId,
          role: app.role,
        },
      })

      // Записываем трансфер
      await prisma.transfer.create({
        data: {
          playerId: app.playerId,
          fromTeamSeasonId: app.fromTeamSeasonId,
          toTeamSeasonId: app.toTeamSeasonId,
          date: new Date(),
          note: app.coachNote,
        },
      })

      // Обновляем статус заявки
      await prisma.rosterApplication.update({
        where: { id: app.id },
        data: {
          status: 'APPROVED',
          moderatorNote: parsed.data.moderatorNote || null,
          reviewedById: auth.user.id,
          reviewedAt: new Date(),
        },
      })
    }

    revalidatePath('/admin/moderation')
    revalidatePath('/coach/roster')
    revalidatePath('/coach/transfers')
    return { success: true }
  } catch {
    return { error: 'Ошибка при обработке заявки' }
  }
}

// === Отклонить заявку ===

const RejectSchema = z
  .object({
    id: z.string().min(1),
    moderatorNote: z.string().min(1, 'Укажите причину отклонения').max(500),
  })
  .strip()

export async function rejectApplicationAction(input: unknown) {
  const auth = await requireAdminAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = RejectSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Укажите причину отклонения' }
  }

  const app = await prisma.rosterApplication.findUnique({
    where: { id: parsed.data.id },
  })

  if (!app) {
    return { error: 'Заявка не найдена' }
  }
  if (app.status !== 'PENDING') {
    return { error: 'Заявка уже рассмотрена' }
  }

  await prisma.rosterApplication.update({
    where: { id: app.id },
    data: {
      status: 'REJECTED',
      moderatorNote: parsed.data.moderatorNote,
      reviewedById: auth.user.id,
      reviewedAt: new Date(),
    },
  })

  revalidatePath('/admin/moderation')
  revalidatePath('/coach/transfers')
  return { success: true }
}

// === Количество PENDING заявок (для badge в sidebar) ===

export const getPendingCountAction = adminGuard(async () => {
  const count = await prisma.rosterApplication.count({
    where: { status: 'PENDING' },
  })

  return { count }
})
