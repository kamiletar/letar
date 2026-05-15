'use server'

/**
 * Выдача карточек (нарушений) во время матча.
 */

import type { CardReason, CardType } from '@/generated/prisma'
import { checkCardConsequences, getCardRules } from '@/lib/cards'
import { prisma } from '@/lib/db'
import { broadcastMatchEvent } from '@/lib/sse/broadcast'

/** Выдать карточку */
export async function issueCardAction(
  matchId: string,
  performanceId: string,
  cardType: CardType,
  reason: CardReason,
  note?: string
) {
  // Загружаем контекст матча и сезона
  const performance = await prisma.playerPerformance.findUnique({
    where: { id: performanceId },
    include: {
      player: { select: { id: true, name: true } },
      teamSeason: {
        include: {
          season: { select: { format: true, id: true } },
        },
      },
    },
  })

  if (!performance) {
    return { success: false, error: 'Выступление не найдено' }
  }

  const rules = getCardRules(performance.teamSeason.season.format)
  const seasonId = performance.teamSeason.season.id

  // Считаем жёлтые игрока в текущем матче
  const playerYellowsInMatch = await prisma.card.count({
    where: {
      performance: { matchId, playerId: performance.playerId },
      type: 'YELLOW',
    },
  })

  // Считаем жёлтые команды за сезон
  const teamYellowsInSeason = await prisma.card.count({
    where: {
      teamSeasonId: performance.teamSeasonId,
      type: 'YELLOW',
    },
  })

  // Проверяем последствия
  const consequences = checkCardConsequences(rules, cardType, playerYellowsInMatch, teamYellowsInSeason)

  // Создаём карточку
  const actualType = consequences.upgradeToRed ? 'RED' : cardType
  await prisma.card.create({
    data: {
      performanceId,
      teamSeasonId: performance.teamSeasonId,
      type: actualType,
      reason,
      note: note ?? null,
    },
  })

  // Если 2 жёлтых = красная — создаём дополнительную красную
  if (consequences.upgradeToRed && cardType === 'YELLOW') {
    await prisma.card.create({
      data: {
        performanceId,
        teamSeasonId: performance.teamSeasonId,
        type: 'RED',
        reason: 'OTHER',
        note: 'Автоматическая красная: 2 жёлтых за матч',
      },
    })
  }

  // Создаём отстранение если нужно
  if (consequences.createSuspension && consequences.suspensionMatches) {
    await prisma.playerSuspension.create({
      data: {
        playerId: performance.playerId,
        seasonId,
        reason: consequences.suspensionReason ?? 'RED_CARD',
        matchesLeft: consequences.suspensionMatches,
        active: true,
      },
    })
  }

  // Дисквалификация команды (5 жёлтых за сезон в ROUND_ROBIN)
  if (consequences.disqualifyTeam) {
    await prisma.teamSeason.update({
      where: { id: performance.teamSeasonId },
      data: { disqualified: true },
    })
  }

  // Broadcast через SSE
  broadcastMatchEvent(matchId, 'card:issued', {
    performanceId,
    playerName: performance.player.name,
    cardType: actualType,
    reason,
    upgradeToRed: consequences.upgradeToRed,
    disqualifyTeam: consequences.disqualifyTeam,
    suspension: consequences.createSuspension,
  })

  return {
    success: true,
    actualType,
    upgradeToRed: consequences.upgradeToRed,
    disqualifyTeam: consequences.disqualifyTeam,
    suspension: consequences.createSuspension,
    suspensionReason: consequences.suspensionReason,
  }
}
