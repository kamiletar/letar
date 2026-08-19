/**
 * Клиентский хук для SSE подключения к live scoring матча
 *
 * Адаптация use-realtime из driving-school для match-специфичных событий.
 *
 * @module use-match-sse
 */

'use client'

import type { MatchEventType } from '@/lib/sse/match-sse-manager'
import type { ConnectedJudge, CurrentPerformance, TimerState, VotingPhase } from '@/lib/sse/match-state'
import { useEventSource } from '@letar/hooks'
import { useCallback, useMemo, useRef, useState } from 'react'

// === Типы ===

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/** Состояние матча, получаемое через SSE */
export interface MatchSSEState {
  phase: VotingPhase
  currentHalf: number
  currentRound: number
  /** Ключ приглашения судей (передаётся ведущему для показа QR) */
  inviteKey: string | null
  judges: Array<Pick<ConnectedJudge, 'sessionId' | 'name' | 'judgeNumber' | 'hasVoted' | 'color' | 'manual'>>
  currentPerformances: CurrentPerformance[]
  currentPerformerIndex: number
  timer: TimerState
  votingOpenedAt: number | null
  /** Разрешён ли отвод судьи тренерами */
  judgeRecusalAllowed?: boolean
  /** Текущие оценки судей: judgeNumber → score (сбрасывается при смене измерения) */
  currentVoteScores?: Partial<Record<number, number>>
}

export interface MatchSSEEvent {
  type: MatchEventType
  payload: unknown
  timestamp: number
}

export interface UseMatchSSEOptions {
  /** ID матча */
  matchId: string
  /** Роль подключающегося */
  role: 'scorer' | 'presenter' | 'coach' | 'judge' | 'public'
  /** Токен доступа (для scorer/presenter) */
  token?: string
  /** Callback при получении события */
  onEvent?: (event: MatchSSEEvent) => void
  /** Включить подключение */
  enabled?: boolean
}

export interface UseMatchSSEReturn {
  /** Статус подключения */
  status: ConnectionStatus
  /** Текущее состояние матча */
  matchState: MatchSSEState | null
  /** Последнее событие */
  lastEvent: MatchSSEEvent | null
  /** Переподключиться */
  reconnect: () => void
}

const MATCH_EVENT_TYPES: MatchEventType[] = [
  'judge:connected',
  'judge:disconnected',
  'vote:received',
  'vote:complete',
  'phase:changed',
  'player:sent',
  'score:calculated',
  'match:started',
  'match:finished',
  'timer:started',
  'timer:stopped',
  'timer:reset',
  'voting:cancelled',
  'card:issued',
  'audience:voted',
  'coach:signal',
  'vote:timeout',
  'lineup:updated',
  'coin:flipped',
  'victory-poem:set',
  'ping',
]

// === Хук ===

export function useMatchSSE({ matchId, role, token, onEvent, enabled = true }: UseMatchSSEOptions): UseMatchSSEReturn {
  const [matchState, setMatchState] = useState<MatchSSEState | null>(null)
  const [lastEvent, setLastEvent] = useState<MatchSSEEvent | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const url = useMemo(() => {
    const params = new URLSearchParams({ role })
    if (token) {
      params.set('token', token)
    }
    return `/api/match/${matchId}/sse?${params.toString()}`
  }, [matchId, role, token])

  const handleEvent = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as MatchSSEEvent
      setLastEvent(data)

      // Обновляем состояние матча из phase:changed
      if (data.type === 'phase:changed' && data.payload) {
        setMatchState(data.payload as MatchSSEState)
      }

      onEventRef.current?.(data)
    } catch {
      // Игнорируем невалидные данные
    }
  }, [])

  const events = useMemo(() => {
    const map: Record<string, (event: MessageEvent) => void> = {}
    for (const eventType of MATCH_EVENT_TYPES) {
      map[eventType] = handleEvent
    }
    return map
  }, [handleEvent])

  const { status, reconnect } = useEventSource({
    url,
    enabled,
    reconnect: { strategy: 'linear', baseDelayMs: 3000, maxDelayMs: 30000, maxAttempts: 10 },
    events,
  })

  return { status, matchState, lastEvent, reconnect }
}
