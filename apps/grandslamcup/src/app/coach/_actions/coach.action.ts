'use server'

/**
 * Server actions кабинета тренера
 *
 * Обновление профиля команды, подача заявки на матч.
 */

import { prisma } from '@/lib/db'
import { requireCoachAction } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Обновить профиль команды ===

const UpdateTeamSchema = z
  .object({
    description: z.string().max(2000).optional(),
    telegramLink: z.string().url().optional().or(z.literal('')),
    vkLink: z.string().url().optional().or(z.literal('')),
  })
  .strip()

export async function updateTeamProfileAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) { return { error: auth.error } }

  const parsed = UpdateTeamSchema.safeParse(input)
  if (!parsed.success) { return { error: parsed.error.flatten() } }

  try {
    await prisma.team.update({
      where: { id: auth.coach.teamId },
      data: {
        description: parsed.data.description,
        telegramLink: parsed.data.telegramLink || null,
        vkLink: parsed.data.vkLink || null,
      },
    })

    revalidatePath('/coach')
    return { success: true }
  } catch (error) {
    console.error('[updateTeamProfileAction] ошибка:', error)
    return { error: 'Не удалось обновить профиль команды' }
  }
}

// === Подать заявку на матч (5-8 игроков) ===

const SubmitLineupSchema = z
  .object({
    matchId: z.string(),
    playerIds: z.array(z.string()).min(5),
  })
  .strip()

export async function submitMatchLineupAction(input: unknown) {
  const auth = await requireCoachAction()
  if (!auth.success) { return { error: auth.error } }

  const parsed = SubmitLineupSchema.safeParse(input)
  if (!parsed.success) { return { error: 'Нужно выбрать минимум 5 игроков' } }

  const { matchId, playerIds } = parsed.data

  try {
    // Загружаем матч
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    })

    if (!match) { return { error: 'Матч не найден' } }
    if (match.status !== 'SCHEDULED') { return { error: 'Матч уже начался или завершён' } }

    // Проверяем что это матч нашей команды
    const isHome = match.homeTeamId === auth.coach.teamSeasonId
    const isAway = match.awayTeamId === auth.coach.teamSeasonId
    if (!isHome && !isAway) { return { error: 'Это не матч вашей команды' } }

    // Проверяем что заявка подаётся за 6+ часов до матча
    if (match.scheduledAt) {
      const hoursUntil = (match.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60)
      if (hoursUntil < 6) {
        return { error: 'Заявку нужно подать минимум за 6 часов до матча' }
      }
    }

    // Проверяем что все игроки — активные члены команды
    const activePlayers = await prisma.playerTeamSeason.findMany({
      where: {
        teamSeasonId: auth.coach.teamSeasonId,
        playerId: { in: playerIds },
        leftAt: null,
      },
      select: { playerId: true },
    })

    if (activePlayers.length !== playerIds.length) {
      return { error: 'Некоторые игроки не являются активными членами команды' }
    }

    // Проверяем отстранения — нельзя включать отстранённых поэтов
    const suspendedPlayers = await prisma.playerSuspension.findMany({
      where: {
        playerId: { in: playerIds },
        active: true,
      },
      include: {
        player: { select: { name: true } },
      },
    })

    if (suspendedPlayers.length > 0) {
      const names = suspendedPlayers.map((s) => {
        if (s.untilEndOfSeason) {
          return `${s.player.name} (дисквалифицирован до конца сезона)`
        }
        const left = s.matchesLeft
        return `${s.player.name} (${left} ${left === 1 ? 'матч' : left < 5 ? 'матча' : 'матчей'})`
      })
      return { error: `Отстранённые поэты не могут быть включены в заявку: ${names.join(', ')}` }
    }

    // Удаляем старую заявку (если была)
    await prisma.matchLineup.deleteMany({
      where: { matchId, teamSeasonId: auth.coach.teamSeasonId },
    })

    // Создаём новую заявку
    await prisma.matchLineup.createMany({
      data: playerIds.map((playerId) => ({
        matchId,
        playerId,
        teamSeasonId: auth.coach.teamSeasonId,
        status: 'UNUSED' as const,
      })),
    })

    revalidatePath('/coach')
    revalidatePath('/coach/matches')

    // Автоанонс: если обе команды подали составы → публикуем в Telegram
    const otherTeamId = isHome ? match.awayTeamId : match.homeTeamId
    if (otherTeamId) {
      const otherLineup = await prisma.matchLineup.findFirst({
        where: { matchId, teamSeasonId: otherTeamId },
      })
      if (otherLineup) {
        // Обе команды заявили составы — автопубликация анонса
        import('@/lib/telegram/auto-publish').then((m) => m.autoPublishAnnouncement(matchId)).catch(() => {})
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[submitMatchLineupAction] ошибка:', error)
    return { error: 'Не удалось подать заявку' }
  }
}
