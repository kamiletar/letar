'use server'

/**
 * Server actions для экрана тренера на матче
 *
 * Валидация доступа через coach-токен (homeCoachToken / awayCoachToken).
 * Тренер может: выпустить игрока, сделать замену во 2-м тайме.
 */

import { prisma } from '@/lib/db'
import { broadcastMatchEvent, broadcastState } from '@/lib/sse/broadcast'
import { getMatchState, updateMatchState } from '@/lib/sse/match-state'

// === Вспомогательная функция: проверка токена тренера ===

async function validateCoachToken(matchId: string, coachToken: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      status: true,
      homeCoachToken: true,
      awayCoachToken: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  })

  if (!match) {
    return null
  }

  let side: 'home' | 'away' | null = null
  if (coachToken === match.homeCoachToken) {
    side = 'home'
  } else if (coachToken === match.awayCoachToken) {
    side = 'away'
  }

  if (!side) {
    return null
  }

  const teamSeasonId = side === 'home' ? match.homeTeamId : match.awayTeamId
  return { match, side, teamSeasonId }
}

// === Выпустить игрока на сцену ===

export async function sendPlayerAction(
  matchId: string,
  coachToken: string,
  playerId: string,
  playerName: string,
  teamName: string,
) {
  const ctx = await validateCoachToken(matchId, coachToken)
  if (!ctx) {
    return { success: false, error: 'Неверный токен' }
  }
  if (ctx.match.status !== 'LIVE') {
    return { success: false, error: 'Матч не в эфире' }
  }

  try {
    const state = getMatchState(matchId)

    // Проверяем что сейчас IDLE (ожидание поэта)
    if (state.phase !== 'IDLE' && state.phase !== 'ROUND_COMPLETE') {
      return { success: false, error: 'Сейчас нельзя выпустить игрока' }
    }

    // Проверяем что игрок есть в заявке этой команды
    const lineup = await prisma.matchLineup.findFirst({
      where: { matchId, playerId, teamSeasonId: ctx.teamSeasonId },
    })
    if (!lineup) {
      return { success: false, error: 'Игрок не в заявке' }
    }

    // Проверяем что игрок не выступал в этом тайме
    // (один игрок может выступать в обоих таймах, но не дважды в одном)
    const playedInCurrentHalf = await prisma.playerPerformance.findFirst({
      where: {
        matchId,
        playerId,
        half: state.currentHalf,
      },
    })
    if (playedInCurrentHalf) {
      return { success: false, error: 'Игрок уже выступал в этом тайме' }
    }

    // Создаём PlayerPerformance в БД
    const performance = await prisma.playerPerformance.create({
      data: {
        matchId,
        playerId,
        teamSeasonId: ctx.teamSeasonId,
        half: state.currentHalf,
        roundNumber: state.currentRound,
        textScores: [],
        deliveryScores: [],
      },
    })

    // Обновляем MatchLineup статус
    const newStatus = state.currentHalf === 1
      ? 'STARTER_HALF1'
      : lineup.status === 'STARTER_HALF1'
      ? 'STARTER_HALF1' // уже играл в 1-м, оставляем
      : 'STARTER_HALF2'

    if (lineup.status === 'UNUSED' || lineup.status === 'SUBSTITUTE') {
      await prisma.matchLineup.update({
        where: { id: lineup.id },
        data: { status: newStatus },
      })
    }

    // Обновляем in-memory состояние
    updateMatchState(matchId, (s) => {
      s.currentPerformances[s.currentPerformerIndex] = {
        performanceId: performance.id,
        playerName,
        teamSeasonId: ctx.teamSeasonId,
        teamName,
        half: s.currentHalf,
        roundNumber: s.currentRound,
      }
    })

    // Транслируем SSE
    broadcastMatchEvent(matchId, 'player:sent', {
      performanceId: performance.id,
      playerName,
      teamName,
      performerIndex: state.currentPerformerIndex,
    })
    broadcastState(matchId)

    return { success: true, performanceId: performance.id }
  } catch (error) {
    console.error('[sendPlayerAction] ошибка:', error)
    return { success: false, error: 'Не удалось выпустить игрока' }
  }
}

// === Замена игрока во 2-м тайме ===

export async function substitutePlayerAction(
  matchId: string,
  coachToken: string,
  outPlayerId: string,
  inPlayerId: string,
) {
  const ctx = await validateCoachToken(matchId, coachToken)
  if (!ctx) {
    return { success: false, error: 'Неверный токен' }
  }
  if (ctx.match.status !== 'LIVE') {
    return { success: false, error: 'Матч не в эфире' }
  }

  try {
    const state = getMatchState(matchId)
    if (state.currentHalf !== 2) {
      return { success: false, error: 'Замены только во 2-м тайме' }
    }

    // Считаем уже сделанные замены этой командой
    const substitutions = await prisma.matchLineup.count({
      where: {
        matchId,
        teamSeasonId: ctx.teamSeasonId,
        status: 'SUBSTITUTE',
      },
    })
    if (substitutions >= 2) {
      return { success: false, error: 'Лимит замен исчерпан (макс 2)' }
    }

    // Проверяем что выходящий игрок в заявке и запасной
    const outLineup = await prisma.matchLineup.findFirst({
      where: { matchId, playerId: outPlayerId, teamSeasonId: ctx.teamSeasonId },
    })
    if (!outLineup) {
      return { success: false, error: 'Выходящий игрок не в заявке' }
    }

    // Проверяем что входящий игрок в заявке и ещё не играл
    const inLineup = await prisma.matchLineup.findFirst({
      where: {
        matchId,
        playerId: inPlayerId,
        teamSeasonId: ctx.teamSeasonId,
        status: 'UNUSED',
      },
    })
    if (!inLineup) {
      return { success: false, error: 'Запасной игрок не найден или уже играл' }
    }

    // Обновляем статусы
    await prisma.matchLineup.update({
      where: { id: inLineup.id },
      data: { status: 'SUBSTITUTE' },
    })

    return { success: true }
  } catch (error) {
    console.error('[substitutePlayerAction] ошибка:', error)
    return { success: false, error: 'Не удалось выполнить замену' }
  }
}

// === Запрос на отвод судьи ===

export async function requestJudgeRecusalAction(matchId: string, coachToken: string, judgeColor: string) {
  const ctx = await validateCoachToken(matchId, coachToken)
  if (!ctx) {
    return { success: false, error: 'Неверный токен' }
  }
  if (ctx.match.status !== 'LIVE') {
    return { success: false, error: 'Матч не в эфире' }
  }

  try {
    const state = getMatchState(matchId)

    // Проверяем что отвод судьи разрешён ведущим
    if (!state.judgeRecusalAllowed) {
      return { success: false, error: 'Отвод судьи не разрешён ведущим' }
    }

    // Ищем судью по цвету (новая система идентификации)
    const judge = state.judges.find((j) => j.color === judgeColor)
    if (!judge) {
      return { success: false, error: `Судья с цветом ${judgeColor} не найден` }
    }

    // Отправляем запрос ведущему через SSE
    broadcastMatchEvent(matchId, 'judge:recusal-requested', {
      judgeNumber: judge.judgeNumber,
      judgeColor,
      judgeName: judge.name,
      requestedBy: ctx.side,
    })

    return { success: true, judgeName: judge.name, judgeColor }
  } catch (error) {
    console.error('[requestJudgeRecusalAction] ошибка:', error)
    return { success: false, error: 'Не удалось отправить запрос' }
  }
}

// === Запрос паузы от тренера ===

export async function requestTimeoutAction(matchId: string, coachToken: string, reason: string) {
  const ctx = await validateCoachToken(matchId, coachToken)
  if (!ctx) {
    return { success: false, error: 'Неверный токен' }
  }
  if (ctx.match.status !== 'LIVE') {
    return { success: false, error: 'Матч не в эфире' }
  }

  // Получаем имя команды
  const teamSeason = await prisma.teamSeason.findUnique({
    where: { id: ctx.teamSeasonId },
    include: { team: { select: { name: true } } },
  })

  const teamName = teamSeason?.team.name ?? (ctx.side === 'home' ? 'Хозяева' : 'Гости')

  broadcastMatchEvent(matchId, 'coach:signal', {
    type: 'timeout',
    side: ctx.side,
    teamName,
    reason: reason || 'Запрос паузы',
  })

  return { success: true }
}
