'use server'

/**
 * Заявка составов от счетовода — используется когда тренер не пришёл,
 * а матч уже нужно начинать. Счетовод на своём экране жмёт «Заявить состав»
 * для команды без lineup и выбирает игроков из активного состава.
 *
 * Доступ — по scorerToken (как и все остальные scorer actions). Страница
 * `/match/[id]/score` публична по ссылке с токеном, без логина, поэтому
 * action НЕ требует auth session, а проверяет `match.scorerToken === token`.
 */

import { prisma } from '@/lib/db'
import { broadcastMatchEvent } from '@/lib/sse/broadcast'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const SubmitScorerLineupSchema = z
  .object({
    matchId: z.string().cuid(),
    scorerToken: z.string().min(1, 'Требуется scorer token'),
    teamSeasonId: z.string().cuid(),
    playerIds: z.array(z.string().cuid()).min(5, 'Нужно минимум 5 игроков').max(8, 'Максимум 8 игроков'),
  })
  .strip()

export async function submitScorerLineupAction(input: unknown) {
  const parsed = SubmitScorerLineupSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: 'Нужно выбрать от 5 до 8 игроков' }
  }

  const { matchId, scorerToken, teamSeasonId, playerIds } = parsed.data

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        scorerToken: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    })

    if (!match) {
      return { success: false as const, error: 'Матч не найден' }
    }

    // Проверка токена — как и все остальные scorer actions
    if (match.scorerToken !== scorerToken) {
      return { success: false as const, error: 'Неверный scorer token' }
    }

    // Проверяем что teamSeasonId — одна из команд матча
    if (teamSeasonId !== match.homeTeamId && teamSeasonId !== match.awayTeamId) {
      return { success: false as const, error: 'Эта команда не играет в этом матче' }
    }

    // Проверяем что все игроки — активные члены указанной команды
    const activePlayers = await prisma.playerTeamSeason.findMany({
      where: {
        teamSeasonId,
        playerId: { in: playerIds },
        leftAt: null,
      },
      select: { playerId: true },
    })

    if (activePlayers.length !== playerIds.length) {
      return {
        success: false as const,
        error: 'Некоторые игроки не являются активными членами команды',
      }
    }

    // Проверяем отстранения
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
      const names = suspendedPlayers.map((s) => s.player.name)
      return {
        success: false as const,
        error: `Отстранённые поэты не могут быть включены: ${names.join(', ')}`,
      }
    }

    // Перезаписываем lineup для этой команды
    await prisma.matchLineup.deleteMany({
      where: { matchId, teamSeasonId },
    })

    await prisma.matchLineup.createMany({
      data: playerIds.map((playerId) => ({
        matchId,
        playerId,
        teamSeasonId,
        status: 'UNUSED' as const,
      })),
    })

    revalidatePath(`/match/${matchId}/score`)
    revalidatePath(`/match/${matchId}`)

    // Уведомляем всех подписчиков SSE (ведущий, тренеры) что состав обновился
    broadcastMatchEvent(matchId, 'lineup:updated', { teamSeasonId })

    return { success: true as const }
  } catch (error) {
    console.error('[submitScorerLineupAction] ошибка:', error)
    return { success: false as const, error: 'Не удалось сохранить заявку' }
  }
}
