'use server'

/**
 * Жизненный цикл матча: старт, завершение тайма, завершение матча.
 */

import { advanceWinner } from '@/lib/bracket-advance'
import { prisma } from '@/lib/db'
import { broadcastMatchEvent, broadcastState } from '@/lib/sse/broadcast'
import { updateMatchState } from '@/lib/sse/match-state'
import { autoPublishHalfTime, autoPublishResult } from '@/lib/telegram/auto-publish'

/** Старт матча */
export async function startMatchAction(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId } })
  if (!match) {
    return { success: false, error: 'Матч не найден' }
  }
  if (match.status === 'LIVE') {
    return { success: false, error: 'Матч уже идёт' }
  }
  if (match.status === 'FINISHED') {
    return { success: false, error: 'Матч завершён' }
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { status: 'LIVE' },
  })

  updateMatchState(matchId, (state) => {
    state.phase = 'IDLE'
    state.currentHalf = 1
    state.currentRound = 1
  })

  broadcastMatchEvent(matchId, 'match:started', { matchId })
  broadcastState(matchId)

  // Отправляем ссылку на голосование в Telegram (Mini App)
  import('@/lib/telegram/senders').then((m) => m.sendVotingLink(matchId)).catch(() => {
    // намеренно игнорируем — публикация в Telegram необязательна для основного флоу
  })

  return { success: true }
}

/** Завершить тайм */
export async function finishHalfAction(matchId: string) {
  updateMatchState(matchId, (s) => {
    s.currentHalf = 2
    s.currentRound = 1
    s.currentPerformerIndex = 0
    s.currentPerformances = []
    s.judges = []
    s.inviteKey = null
    s.currentVoteScores = {}
    // INTERMISSION — явная фаза перерыва; SELECT_JURY появится только после createJuryInviteAction
    s.phase = 'INTERMISSION'
  })

  broadcastState(matchId)

  // Автопубликация итога 1-го тайма в Telegram (если включено)
  autoPublishHalfTime(matchId, 1).catch(() => {
    // намеренно игнорируем — публикация в Telegram необязательна для основного флоу
  })

  return { success: true }
}

/** Завершить матч */
export async function finishMatchAction(matchId: string) {
  // Подсчитываем итоговый счёт из перформансов
  const performances = await prisma.playerPerformance.findMany({
    where: { matchId },
    include: { teamSeason: true },
  })

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true },
  })

  if (!match) {
    return { success: false, error: 'Матч не найден' }
  }

  let homeScore = 0
  let awayScore = 0

  for (const p of performances) {
    if (p.totalScore !== null) {
      if (p.teamSeasonId === match.homeTeamId) {
        homeScore += p.totalScore
      } else {
        awayScore += p.totalScore
      }
    }
  }

  // Определяем турнирные очки
  let homePoints: number
  let awayPoints: number
  if (homeScore > awayScore) {
    homePoints = 1
    awayPoints = 0
  } else if (homeScore < awayScore) {
    homePoints = 0
    awayPoints = 1
  } else {
    homePoints = 0.5
    awayPoints = 0.5
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: 'FINISHED',
      homeScore,
      awayScore,
      homePoints,
      awayPoints,
    },
  })

  broadcastMatchEvent(matchId, 'match:finished', {
    homeScore,
    awayScore,
    homePoints,
    awayPoints,
  })

  // Автопродвижение в сетке DE (если матч привязан к BracketSlot)
  const bracketResult = await advanceWinner(matchId)
  if (bracketResult.advanced) {
    console.warn(`[Bracket] Продвижение: ${bracketResult.matchesCreated} матчей создано`)
  }

  // Автопубликация результата в Telegram (если включено)
  autoPublishResult(matchId).catch(() => {
    // намеренно игнорируем — публикация в Telegram необязательна для основного флоу
  })

  // Проверяем: все матчи тура завершены → итоги тура
  checkTourComplete(matchId).catch(() => {
    // намеренно игнорируем — итоги тура не блокируют завершение матча
  })

  return { success: true, homeScore, awayScore, homePoints, awayPoints }
}

/**
 * Установить команду, которая начинает 1-й тайм (результат жеребьёвки).
 *
 * Используется в шаге COIN_FLIP wizard'а: после `coinFlipAction` (presenter)
 * счетовод сохраняет результат в БД, чтобы wizard перешёл к выбору поэтов.
 */
export async function setFirstHalfStartTeamAction(matchId: string, side: 'HOME' | 'AWAY') {
  try {
    await prisma.match.update({
      where: { id: matchId },
      data: { firstHalfStartTeam: side },
    })

    broadcastMatchEvent(matchId, 'coin:flipped', { startingSide: side })
    broadcastState(matchId)

    return { success: true as const }
  } catch (error) {
    console.error('[setFirstHalfStartTeamAction] ошибка:', error)
    return { success: false as const, error: 'Не удалось сохранить результат жеребьёвки' }
  }
}

/**
 * Установить поэта, читавшего победное стихотворение + завершить матч.
 *
 * Финальный шаг wizard'а. Проверяет что player принадлежит команде-победителю,
 * сохраняет victoryPoemPlayerId, затем запускает finishMatchAction.
 */
export async function setVictoryPoemAction(matchId: string, playerId: string) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        status: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    })
    if (!match) {
      return { success: false as const, error: 'Матч не найден' }
    }

    // Определяем команду-победителя по performances (homeScore/awayScore в БД
    // заполняются только в finishMatchAction, который вызывается ниже)
    const performances = await prisma.playerPerformance.findMany({
      where: { matchId, totalScore: { not: null } },
      select: { teamSeasonId: true, totalScore: true },
    })
    let homeScore = 0
    let awayScore = 0
    for (const p of performances) {
      if (p.teamSeasonId === match.homeTeamId) { homeScore += p.totalScore ?? 0 }
      else if (p.teamSeasonId === match.awayTeamId) { awayScore += p.totalScore ?? 0 }
    }

    const winnerTeamSeasonId = homeScore > awayScore
      ? match.homeTeamId
      : awayScore > homeScore
      ? match.awayTeamId
      : null
    if (!winnerTeamSeasonId) {
      return { success: false as const, error: 'Ничья — победное стихотворение не назначается' }
    }

    // Проверяем что поэт принадлежит команде-победителю через lineup
    const lineup = await prisma.matchLineup.findFirst({
      where: { matchId, teamSeasonId: winnerTeamSeasonId, playerId },
      select: { id: true },
    })
    if (!lineup) {
      return { success: false as const, error: 'Поэт не из команды-победителя' }
    }

    await prisma.match.update({
      where: { id: matchId },
      data: { victoryPoemPlayerId: playerId },
    })

    broadcastMatchEvent(matchId, 'victory-poem:set', { playerId })

    // Если матч ещё LIVE — финализируем
    if (match.status === 'LIVE') {
      await finishMatchAction(matchId)
    } else {
      broadcastState(matchId)
    }

    return { success: true as const }
  } catch (error) {
    console.error('[setVictoryPoemAction] ошибка:', error)
    return { success: false as const, error: 'Не удалось сохранить победное стихотворение' }
  }
}

/** Проверить: все матчи тура завершены → отправить итоги тура в Telegram */
async function checkTourComplete(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { tourId: true },
  })
  if (!match?.tourId) { return }

  // Проверяем что все матчи тура завершены
  const tourMatches = await prisma.match.findMany({
    where: { tourId: match.tourId },
    select: { status: true },
  })
  const allFinished = tourMatches.length > 0 && tourMatches.every((m) => m.status === 'FINISHED')
  if (!allFinished) { return }

  // Отправляем итоги тура
  const { sendTourSummary } = await import('@/lib/telegram/senders')
  await sendTourSummary(match.tourId)
}
