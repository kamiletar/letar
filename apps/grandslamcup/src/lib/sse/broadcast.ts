/**
 * Хелперы для broadcast SSE событий матча
 *
 * Вынесены из server actions — экспорт из 'use server' файлов
 * требует async-функций, а broadcast синхронный.
 *
 * @module broadcast
 */

import { getMatchSSEManager } from './match-sse-manager'
import { getMatchState } from './match-state'

/** Отправить типизированное событие всем подписчикам матча */
export function broadcastMatchEvent(matchId: string, type: string, payload: unknown) {
  const sseManager = getMatchSSEManager()
  sseManager.broadcast(`match:${matchId}`, {
    type: type as 'phase:changed',
    payload,
    timestamp: Date.now(),
  })
}

/** Отправить полное состояние матча всем подписчикам */
export function broadcastState(matchId: string) {
  const state = getMatchState(matchId)
  broadcastMatchEvent(matchId, 'phase:changed', {
    phase: state.phase,
    currentHalf: state.currentHalf,
    currentRound: state.currentRound,
    inviteKey: state.inviteKey,
    judges: state.judges.map((j) => ({
      sessionId: j.sessionId,
      name: j.name,
      judgeNumber: j.judgeNumber,
      hasVoted: j.hasVoted,
      color: j.color ?? null, // null = ручной слот (телефона нет)
      manual: j.manual ?? false,
    })),
    currentPerformances: state.currentPerformances,
    currentPerformerIndex: state.currentPerformerIndex,
    timer: state.timer,
    votingOpenedAt: state.votingOpenedAt,
    judgeRecusalAllowed: state.judgeRecusalAllowed,
    currentVoteScores: state.currentVoteScores,
  })
}
