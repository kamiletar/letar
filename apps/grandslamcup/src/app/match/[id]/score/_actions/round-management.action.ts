'use server'

/**
 * Управление раундами: следующий раунд, установка выступающего.
 */

import { prisma } from '@/lib/db'
import { broadcastMatchEvent, broadcastState } from '@/lib/sse/broadcast'
import { getMatchState, updateMatchState } from '@/lib/sse/match-state'

/**
 * После оценки подачи скорер нажимает «Показать результат» → POET_RESULT.
 *
 * Явная фаза вместо автоматического перехода при DELIVERY_COMPLETE,
 * чтобы скорер мог посмотреть оценки перед движением дальше.
 */
export async function confirmPoetResultAction(matchId: string) {
  updateMatchState(matchId, (s) => {
    s.phase = 'POET_RESULT'
  })
  broadcastState(matchId)
  return { success: true }
}

/**
 * После PAIR_RESULTS (последней пары тайма) → HALF_SUMMARY.
 *
 * Вызывается из StepPairResults вместо nextRoundAction когда это 5-я пара.
 * Явная фаза исключает ситуацию когда computeWizardStep пропускает PAIR_RESULTS.
 */
export async function showHalfSummaryAction(matchId: string) {
  updateMatchState(matchId, (s) => {
    s.phase = 'HALF_SUMMARY'
  })
  broadcastState(matchId)
  return { success: true }
}

/**
 * Пометить пару завершённой (оба поэта оценены) → ROUND_COMPLETE.
 *
 * Вызывается из StepPoetResult когда второй поэт оценён.
 * computeWizardStep перейдёт в PAIR_RESULTS, где скорер увидит итоги пары
 * и нажмёт «Следующая пара» → nextRoundAction.
 */
export async function finishPairAction(matchId: string) {
  updateMatchState(matchId, (s) => {
    s.phase = 'ROUND_COMPLETE'
  })
  broadcastState(matchId)
  return { success: true }
}

/** Начать выступление поэта: сбросить таймер + запустить + фаза PERFORMING */
export async function startPerformanceAction(matchId: string) {
  const state = getMatchState(matchId)
  const currentPerf = state.currentPerformances[state.currentPerformerIndex]

  updateMatchState(matchId, (s) => {
    s.phase = 'PERFORMING'
    s.timer.isRunning = true
    s.timer.startedAt = Date.now()
    s.timer.accumulatedSec = 0
    s.timer.performanceId = currentPerf?.performanceId ?? null
    // Сбрасываем оценки предыдущего поэта — новое выступление, новые оценки
    s.currentVoteScores = {}
  })

  broadcastState(matchId)
  return { success: true }
}

/**
 * Завершить выступление поэта: остановить таймер, сохранить длительность, перейти к следующему.
 * @param forceDurationSec — если передан, сохраняется это значение вместо фактического
 *   (используется для случая «без жёлтой карточки» — фиксируем ровно 3:01)
 */
export async function endPerformanceAction(matchId: string, forceDurationSec?: number) {
  const state = getMatchState(matchId)
  const timerState = state.timer

  // Вычисляем итоговую длительность
  let totalSec = timerState.accumulatedSec
  if (timerState.isRunning && timerState.startedAt) {
    totalSec += (Date.now() - timerState.startedAt) / 1000
  }
  totalSec = forceDurationSec ?? Math.round(totalSec)

  // Сохраняем длительность в БД
  const performanceId = timerState.performanceId
  if (performanceId) {
    await prisma.playerPerformance.update({
      where: { id: performanceId },
      data: { durationSec: totalSec },
    })
  }

  const performerIndex = state.currentPerformerIndex

  updateMatchState(matchId, (s) => {
    // Останавливаем таймер
    s.timer.isRunning = false
    s.timer.startedAt = null
    s.timer.accumulatedSec = 0
    s.timer.performanceId = null

    if (performerIndex === 0) {
      // Первый поэт отвыступал → выбираем второго
      s.currentPerformerIndex = 1
      s.phase = 'IDLE'
    } else {
      // Оба отвыступали → начинаем голосование за первого поэта
      s.currentPerformerIndex = 0
      s.phase = 'TEXT_VOTING'
    }
  })

  // Если оба выступили — уведомляем о старте голосования через SSE событие
  if (performerIndex === 1) {
    broadcastMatchEvent(matchId, 'vote:received', { dimension: 'TEXT' })
  }

  broadcastState(matchId)
  return { success: true }
}

/** Следующий раунд / переключение на второго поэта */
export async function nextRoundAction(matchId: string) {
  updateMatchState(matchId, (s) => {
    // При любом переходе сбрасываем оценки предыдущего поэта
    s.currentVoteScores = {}
    if (s.currentPerformerIndex === 0 && s.currentPerformances.length === 2) {
      // Оба поэта уже выступили, голосовали за первого → голосуем за второго
      s.currentPerformerIndex = 1
      s.phase = 'TEXT_VOTING'
    } else if (s.currentPerformerIndex < 1) {
      // Переключение на второго поэта (выбор)
      s.currentPerformerIndex = 1
      s.phase = 'IDLE'
    } else {
      // Оба поэта оценены → следующая пара
      s.currentRound++
      s.currentPerformerIndex = 0
      s.currentPerformances = []
      s.phase = 'IDLE'
    }
  })

  broadcastState(matchId)
  return { success: true }
}

/** Установить текущего выступающего */
export async function setCurrentPerformerAction(
  matchId: string,
  playerId: string,
  playerName: string,
  teamSeasonId: string,
  teamName: string
) {
  const state = getMatchState(matchId)

  // Создаём PlayerPerformance в БД
  const performance = await prisma.playerPerformance.create({
    data: {
      matchId,
      playerId,
      teamSeasonId,
      half: state.currentHalf,
      roundNumber: state.currentRound,
      textScores: [],
      deliveryScores: [],
    },
  })

  updateMatchState(matchId, (s) => {
    s.currentPerformances[s.currentPerformerIndex] = {
      performanceId: performance.id,
      playerName,
      teamSeasonId,
      teamName,
      half: s.currentHalf,
      roundNumber: s.currentRound,
    }
  })

  broadcastMatchEvent(matchId, 'player:sent', {
    performanceId: performance.id,
    playerName,
    teamName,
    performerIndex: state.currentPerformerIndex,
  })
  broadcastState(matchId)

  return { success: true, performanceId: performance.id }
}
