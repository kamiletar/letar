'use server'

/**
 * Server actions для заявок на товарищеский матч.
 *
 * requestFriendlyMatchAction — создание вызова тренером
 * respondToFriendlyChallengeAction — ответ тренера-соперника (принять/отклонить)
 * getMyFriendlyRequestsAction — список заявок тренера (отправленные)
 * getIncomingChallengesAction — входящие вызовы для команды тренера
 */

import { prisma } from '@/lib/db'
import { requireCoachAction } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Подать вызов на товарищеский матч ===

const RequestFriendlySchema = z
  .object({
    toTeamSeasonId: z.string().min(1, 'Выберите соперника'),
    venueId: z.string().optional(),
    preferredDate: z.string().optional(),
    note: z.string().max(500).optional(),
  })
  .strip()

export async function requestFriendlyMatchAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = RequestFriendlySchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const { toTeamSeasonId, venueId, preferredDate, note } = parsed.data

  // Нельзя подать вызов своей же команде
  if (toTeamSeasonId === auth.coach.teamSeasonId) {
    return { error: 'Нельзя запросить матч против своей команды' }
  }

  // Проверяем что соперник существует и в том же сезоне
  const opponent = await prisma.teamSeason.findUnique({
    where: { id: toTeamSeasonId },
    select: { seasonId: true },
  })

  if (!opponent) {
    return { error: 'Команда-соперник не найдена' }
  }
  if (opponent.seasonId !== auth.coach.seasonId) {
    return { error: 'Соперник должен быть из того же сезона' }
  }

  try {
    await prisma.friendlyMatchRequest.create({
      data: {
        fromTeamSeasonId: auth.coach.teamSeasonId,
        toTeamSeasonId,
        venueId: venueId || null,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        note: note || null,
        status: 'CHALLENGE_SENT',
        submittedById: auth.coach.userId,
      },
    })

    revalidatePath('/coach/friendly')
    return { success: true }
  } catch (error) {
    console.error('[requestFriendlyMatchAction] ошибка:', error)
    return { error: 'Не удалось создать заявку' }
  }
}

// === Ответ тренера-соперника на вызов ===

const RespondSchema = z
  .object({
    id: z.string().min(1),
    accept: z.boolean(),
    declineReason: z.string().max(500).optional(),
  })
  .strip()

export async function respondToFriendlyChallengeAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = RespondSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  const { id, accept, declineReason } = parsed.data

  const request = await prisma.friendlyMatchRequest.findUnique({
    where: { id },
    select: {
      status: true,
      toTeamSeasonId: true,
    },
  })

  if (!request) {
    return { error: 'Заявка не найдена' }
  }

  // Только тренер команды-соперника может ответить
  if (request.toTeamSeasonId !== auth.coach.teamSeasonId) {
    return { error: 'Вы не являетесь тренером вызываемой команды' }
  }

  if (request.status !== 'CHALLENGE_SENT') {
    return { error: 'На этот вызов уже ответили' }
  }

  try {
    await prisma.friendlyMatchRequest.update({
      where: { id },
      data: {
        status: accept ? 'ACCEPTED' : 'DECLINED',
        respondedById: auth.coach.userId,
        respondedAt: new Date(),
        declineReason: accept ? null : declineReason || null,
      },
    })

    revalidatePath('/coach/friendly')
    revalidatePath('/admin/moderation')
    return { success: true }
  } catch (error) {
    console.error('[respondToFriendlyChallengeAction] ошибка:', error)
    return { error: 'Не удалось обработать ответ' }
  }
}

// === Список заявок тренера (отправленные + полученные) ===

export async function getMyFriendlyRequestsAction() {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const requests = await prisma.friendlyMatchRequest.findMany({
    where: {
      OR: [{ fromTeamSeasonId: auth.coach.teamSeasonId }, { toTeamSeasonId: auth.coach.teamSeasonId }],
    },
    include: {
      fromTeamSeason: { include: { team: { select: { name: true } } } },
      toTeamSeason: { include: { team: { select: { name: true } } } },
      venue: { select: { name: true } },
      match: { select: { id: true, status: true, scheduledAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return { data: requests }
}

// === Входящие вызовы (ждут ответа от моей команды) ===

export async function getIncomingChallengesAction() {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const challenges = await prisma.friendlyMatchRequest.findMany({
    where: {
      toTeamSeasonId: auth.coach.teamSeasonId,
      status: 'CHALLENGE_SENT',
    },
    include: {
      fromTeamSeason: { include: { team: { select: { name: true } } } },
      venue: { select: { name: true } },
      submittedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return { data: challenges }
}
