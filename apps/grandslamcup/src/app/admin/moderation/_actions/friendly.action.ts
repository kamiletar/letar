'use server'

/**
 * Server actions для модерации заявок на товарищеские матчи.
 *
 * Одобрение → создаёт Match (FRIENDLY) + привязывает к заявке.
 * Отклонение → обновляет статус.
 * Админ видит заявки со статусом ACCEPTED (соперник уже принял вызов).
 */

import type { FriendlyRequestStatus } from '@/generated/prisma'
import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Список заявок на товарищеские матчи ===

export const getFriendlyRequestsAction = adminGuard(async (status?: FriendlyRequestStatus | 'ALL') => {
  const requests = await prisma.friendlyMatchRequest.findMany({
    where: status && status !== 'ALL' ? { status } : undefined,
    include: {
      fromTeamSeason: {
        include: {
          team: { select: { name: true } },
          season: { select: { id: true, name: true } },
        },
      },
      toTeamSeason: {
        include: { team: { select: { name: true } } },
      },
      venue: { select: { name: true } },
      submittedBy: { select: { name: true } },
      respondedBy: { select: { name: true } },
      match: { select: { id: true, status: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })

  return { data: requests }
})

// === Одобрить заявку — создать товарищеский матч ===

const ApproveSchema = z
  .object({
    id: z.string().min(1),
    scheduledAt: z.string().optional(),
    venueId: z.string().optional(),
  })
  .strip()

export const approveFriendlyRequestAction = adminGuard(async (input: unknown) => {
  const parsed = ApproveSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const request = await prisma.friendlyMatchRequest.findUnique({
    where: { id: parsed.data.id },
    include: {
      fromTeamSeason: { select: { seasonId: true } },
    },
  })

  if (!request) {
    return { error: 'Заявка не найдена' }
  }
  if (request.status !== 'ACCEPTED') {
    return { error: 'Заявка должна быть принята соперником перед одобрением' }
  }

  try {
    // Создаём товарищеский матч
    const match = await prisma.match.create({
      data: {
        matchType: 'FRIENDLY',
        seasonId: request.fromTeamSeason.seasonId,
        homeTeamId: request.fromTeamSeasonId,
        awayTeamId: request.toTeamSeasonId,
        venueId: parsed.data.venueId || request.venueId || null,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : request.preferredDate,
        status: 'SCHEDULED',
      },
    })

    // Обновляем заявку — привязываем созданный матч
    await prisma.friendlyMatchRequest.update({
      where: { id: request.id },
      data: {
        status: 'APPROVED',
        matchId: match.id,
      },
    })

    revalidatePath('/admin/moderation')
    revalidatePath('/coach/friendly')
    revalidatePath('/coach/matches')
    return { success: true, matchId: match.id }
  } catch (error) {
    console.error('[approveFriendlyRequestAction] ошибка:', error)
    return { error: 'Ошибка при создании матча' }
  }
})

// === Отклонить заявку ===

const RejectSchema = z
  .object({
    id: z.string().min(1),
  })
  .strip()

export const rejectFriendlyRequestAction = adminGuard(async (input: unknown) => {
  const parsed = RejectSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const request = await prisma.friendlyMatchRequest.findUnique({
    where: { id: parsed.data.id },
  })

  if (!request) {
    return { error: 'Заявка не найдена' }
  }
  if (request.status !== 'ACCEPTED') {
    return { error: 'Можно отклонить только принятую соперником заявку' }
  }

  await prisma.friendlyMatchRequest.update({
    where: { id: request.id },
    data: { status: 'REJECTED' },
  })

  revalidatePath('/admin/moderation')
  revalidatePath('/coach/friendly')
  return { success: true }
})

// === Количество ACCEPTED заявок (ждут одобрения админа) ===

export const getPendingFriendlyCountAction = adminGuard(async () => {
  const count = await prisma.friendlyMatchRequest.count({
    where: { status: 'ACCEPTED' },
  })

  return { count }
})
