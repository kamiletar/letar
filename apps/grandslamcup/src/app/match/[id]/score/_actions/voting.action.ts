'use server'

/**
 * Голосование судей: ввод/сброс оценок, фазы голосования, агрегация.
 */

import { prisma } from '@/lib/db'
import { calculateAdjusted, calculateTotal, isValidScore, JUDGES_COUNT } from '@/lib/scoring'
import { broadcastMatchEvent, broadcastState } from '@/lib/sse/broadcast'
import { getMatchState, updateMatchState } from '@/lib/sse/match-state'

/** Ручной ввод голоса (fallback для судьи без телефона) */
export async function enterManualVoteAction(
  matchId: string,
  performanceId: string,
  judgeNumber: number,
  dimension: 'TEXT' | 'DELIVERY',
  score: number
) {
  if (!isValidScore(score)) {
    return { success: false, error: 'Оценка должна быть от 1 до 5' }
  }

  const state = getMatchState(matchId)
  const judge = state.judges.find((j) => j.judgeNumber === judgeNumber)
  if (!judge) {
    return { success: false, error: `Судья #${judgeNumber} не подключён` }
  }

  // Сохраняем голос в БД (удаляем предыдущий, если был — позволяет изменить оценку)
  await prisma.judgeVote.deleteMany({
    where: { judgeSessionId: judge.sessionId, performanceId, dimension },
  })
  await prisma.judgeVote.create({
    data: {
      judgeSessionId: judge.sessionId,
      performanceId,
      dimension,
      score,
    },
  })

  // Обновляем статус судьи и сохраняем оценку в SSE
  updateMatchState(matchId, (s) => {
    const j = s.judges.find((jj) => jj.judgeNumber === judgeNumber)
    if (j) {
      j.hasVoted = true
    }
    s.currentVoteScores[judgeNumber] = score
  })

  broadcastMatchEvent(matchId, 'vote:received', {
    judgeNumber,
    judgeName: judge.name,
    dimension,
    performanceId,
    score,
  })

  // Проверяем, все ли проголосовали
  const updatedState = getMatchState(matchId)
  const allVoted = updatedState.judges.length === JUDGES_COUNT && updatedState.judges.every((j) => j.hasVoted)

  if (allVoted) {
    await handleAllVotesComplete(matchId, performanceId, dimension)
  }

  return { success: true }
}

/** Сброс голоса судьи */
export async function resetJudgeVoteAction(
  matchId: string,
  performanceId: string,
  judgeNumber: number,
  dimension: 'TEXT' | 'DELIVERY'
) {
  const state = getMatchState(matchId)
  const judge = state.judges.find((j) => j.judgeNumber === judgeNumber)
  if (!judge) {
    return { success: false, error: 'Судья не найден' }
  }

  await prisma.judgeVote.deleteMany({
    where: {
      judgeSessionId: judge.sessionId,
      performanceId,
      dimension,
    },
  })

  updateMatchState(matchId, (s) => {
    const j = s.judges.find((jj) => jj.judgeNumber === judgeNumber)
    if (j) {
      j.hasVoted = false
    }
  })

  broadcastState(matchId)
  return { success: true }
}

/** Начать голосование за текст */
export async function startTextVotingAction(matchId: string) {
  const state = getMatchState(matchId)
  if (state.phase !== 'IDLE' && state.phase !== 'ROUND_COMPLETE') {
    return { success: false, error: `Нельзя начать голосование в фазе ${state.phase}` }
  }

  updateMatchState(matchId, (s) => {
    s.phase = 'TEXT_VOTING'
    s.votingOpenedAt = Date.now()
    // Сбрасываем флаги голосования и оценки предыдущего измерения
    s.judges.forEach((j) => {
      j.hasVoted = false
    })
    s.currentVoteScores = {}
  })

  broadcastState(matchId)
  return { success: true }
}

/**
 * Принудительно завершить голосование с неполным количеством голосов.
 *
 * Используется счетоводом когда какой-то судья завис / не проголосовал / отключился.
 * Считает `adjusted` по имеющимся голосам:
 *   - 5+ голосов → стандартный отброс min/max (сумма 3 средних)
 *   - 3-4 голоса → отброс min/max, сумма оставшихся
 *   - 1-2 голоса → простая сумма
 *   - 0 голосов → ошибка
 */
export async function forceCompleteVotingAction(matchId: string, dimension: 'TEXT' | 'DELIVERY') {
  const state = getMatchState(matchId)
  if (state.phase !== 'TEXT_VOTING' && state.phase !== 'DELIVERY_VOTING') {
    return { success: false, error: `Нельзя завершить голосование в фазе ${state.phase}` }
  }
  if (dimension === 'TEXT' && state.phase !== 'TEXT_VOTING') {
    return { success: false, error: 'Сейчас не фаза голосования за текст' }
  }
  if (dimension === 'DELIVERY' && state.phase !== 'DELIVERY_VOTING') {
    return { success: false, error: 'Сейчас не фаза голосования за подачу' }
  }

  // Берём текущее выступление
  const currentPerf = state.currentPerformances[state.currentPerformerIndex]
  if (!currentPerf) {
    return { success: false, error: 'Нет текущего выступающего' }
  }

  const votes = await prisma.judgeVote.findMany({
    where: { performanceId: currentPerf.performanceId, dimension },
    orderBy: { createdAt: 'asc' },
  })
  if (votes.length === 0) {
    return {
      success: false,
      error: 'Нет ни одного голоса — невозможно подсчитать. Введите хотя бы одну оценку вручную.',
    }
  }

  const scores = votes.map((v) => v.score)

  // Гибкий подсчёт по имеющимся голосам
  let adjusted: number
  if (scores.length >= 5) {
    const sorted = [...scores].sort((a, b) => a - b)
    adjusted = sorted.slice(1, -1).reduce((sum, s) => sum + s, 0)
  } else if (scores.length >= 3) {
    const sorted = [...scores].sort((a, b) => a - b)
    adjusted = sorted.slice(1, -1).reduce((sum, s) => sum + s, 0)
  } else {
    adjusted = scores.reduce((sum, s) => sum + s, 0)
  }

  // Обновляем перформанс в БД
  const updateData: Record<string, unknown> = {}
  if (dimension === 'TEXT') {
    updateData.textScores = scores
    updateData.textAdjusted = adjusted
  } else {
    updateData.deliveryScores = scores
    updateData.deliveryAdjusted = adjusted
  }

  if (dimension === 'DELIVERY') {
    const perf = await prisma.playerPerformance.findUnique({
      where: { id: currentPerf.performanceId },
      select: { textAdjusted: true },
    })
    if (perf && perf.textAdjusted !== null) {
      updateData.totalScore = calculateTotal(perf.textAdjusted, adjusted)
    }
  }

  await prisma.playerPerformance.update({
    where: { id: currentPerf.performanceId },
    data: updateData,
  })

  // Обновляем фазу
  const newPhase = dimension === 'TEXT' ? 'TEXT_COMPLETE' : 'DELIVERY_COMPLETE'
  updateMatchState(matchId, (s) => {
    s.phase = newPhase as typeof s.phase
  })

  broadcastMatchEvent(matchId, 'vote:complete', {
    dimension,
    scores,
    adjusted,
    total: dimension === 'DELIVERY' ? updateData.totalScore : undefined,
    performanceId: currentPerf.performanceId,
    forced: true,
  })

  broadcastState(matchId)
  return { success: true, votesCount: scores.length, adjusted }
}

/**
 * Редактирование оценок уже завершённого выступления.
 *
 * Счетовод исправляет ошибку ввода: принимает массив новых оценок по одному измерению,
 * пересчитывает adjusted + totalScore + пересчитывает счёт матча.
 */
export async function updatePerformanceScoresAction(
  performanceId: string,
  dimension: 'TEXT' | 'DELIVERY',
  scores: number[]
) {
  // Валидация оценок
  if (!Array.isArray(scores) || scores.length === 0 || scores.length > JUDGES_COUNT) {
    return { success: false, error: `Нужно от 1 до ${JUDGES_COUNT} оценок` }
  }
  for (const s of scores) {
    if (!isValidScore(s)) {
      return { success: false, error: 'Оценка должна быть целым числом от 1 до 5' }
    }
  }

  const perf = await prisma.playerPerformance.findUnique({
    where: { id: performanceId },
    select: { matchId: true, teamSeasonId: true, textAdjusted: true, deliveryAdjusted: true, totalScore: true },
  })
  if (!perf) {
    return { success: false, error: 'Выступление не найдено' }
  }

  // Гибкий подсчёт adjusted (как в forceComplete)
  let adjusted: number
  if (scores.length >= 3) {
    const sorted = [...scores].sort((a, b) => a - b)
    adjusted = sorted.slice(1, -1).reduce((sum, s) => sum + s, 0)
  } else {
    adjusted = scores.reduce((sum, s) => sum + s, 0)
  }

  const updateData: Record<string, unknown> = {}
  if (dimension === 'TEXT') {
    updateData.textScores = scores
    updateData.textAdjusted = adjusted
    if (perf.deliveryAdjusted !== null) {
      updateData.totalScore = calculateTotal(adjusted, perf.deliveryAdjusted)
    }
  } else {
    updateData.deliveryScores = scores
    updateData.deliveryAdjusted = adjusted
    if (perf.textAdjusted !== null) {
      updateData.totalScore = calculateTotal(perf.textAdjusted, adjusted)
    }
  }

  await prisma.playerPerformance.update({
    where: { id: performanceId },
    data: updateData,
  })

  // Пересчёт суммарного счёта матча по всем performances
  const allPerfs = await prisma.playerPerformance.findMany({
    where: { matchId: perf.matchId },
    select: { teamSeasonId: true, totalScore: true },
  })

  const match = await prisma.match.findUnique({
    where: { id: perf.matchId },
    select: { homeTeamId: true, awayTeamId: true },
  })

  if (match) {
    const homeScore = allPerfs
      .filter((p) => p.teamSeasonId === match.homeTeamId)
      .reduce((sum, p) => sum + (p.totalScore ?? 0), 0)
    const awayScore = allPerfs
      .filter((p) => p.teamSeasonId === match.awayTeamId)
      .reduce((sum, p) => sum + (p.totalScore ?? 0), 0)

    await prisma.match.update({
      where: { id: perf.matchId },
      data: { homeScore, awayScore },
    })
  }

  broadcastMatchEvent(perf.matchId, 'score:calculated', {
    dimension,
    scores,
    adjusted,
    performanceId,
    edited: true,
  })

  broadcastState(perf.matchId)
  return { success: true, adjusted }
}

/** Начать голосование за подачу */
export async function startDeliveryVotingAction(matchId: string) {
  const state = getMatchState(matchId)
  if (state.phase !== 'TEXT_COMPLETE') {
    return { success: false, error: `Нельзя начать голосование за подачу в фазе ${state.phase}` }
  }

  updateMatchState(matchId, (s) => {
    s.phase = 'DELIVERY_VOTING'
    s.votingOpenedAt = Date.now()
    s.judges.forEach((j) => {
      j.hasVoted = false
    })
    s.currentVoteScores = {}
  })

  broadcastState(matchId)
  return { success: true }
}

/** Обработка когда все 5 судей проголосовали */
async function handleAllVotesComplete(matchId: string, performanceId: string, dimension: 'TEXT' | 'DELIVERY') {
  // Получаем все голоса за это измерение
  const votes = await prisma.judgeVote.findMany({
    where: { performanceId, dimension },
    orderBy: { createdAt: 'asc' },
  })

  const scores = votes.map((v) => v.score)
  const adjusted = calculateAdjusted(scores)

  if (adjusted === null) {
    return
  }

  // Обновляем перформанс в БД
  const updateData: Record<string, unknown> = {}
  if (dimension === 'TEXT') {
    updateData.textScores = scores
    updateData.textAdjusted = adjusted
  } else {
    updateData.deliveryScores = scores
    updateData.deliveryAdjusted = adjusted
  }

  // Если подача — считаем итого
  if (dimension === 'DELIVERY') {
    const perf = await prisma.playerPerformance.findUnique({
      where: { id: performanceId },
      select: { textAdjusted: true },
    })
    if (perf && perf.textAdjusted !== null) {
      updateData.totalScore = calculateTotal(perf.textAdjusted, adjusted)
    }
  }

  await prisma.playerPerformance.update({
    where: { id: performanceId },
    data: updateData,
  })

  // Обновляем фазу
  const newPhase = dimension === 'TEXT' ? 'TEXT_COMPLETE' : 'DELIVERY_COMPLETE'
  updateMatchState(matchId, (s) => {
    s.phase = newPhase as typeof s.phase
  })

  broadcastMatchEvent(matchId, 'vote:complete', {
    dimension,
    scores,
    adjusted,
    total: dimension === 'DELIVERY' ? updateData.totalScore : undefined,
    performanceId,
  })

  broadcastMatchEvent(matchId, 'score:calculated', {
    dimension,
    scores,
    adjusted,
    performanceId,
  })

  broadcastState(matchId)
}
