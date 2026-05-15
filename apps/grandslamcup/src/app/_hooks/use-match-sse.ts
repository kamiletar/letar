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
import { useCallback, useEffect, useRef, useState } from 'react'

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

// === Хук ===

export function useMatchSSE({ matchId, role, token, onEvent, enabled = true }: UseMatchSSEOptions): UseMatchSSEReturn {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [matchState, setMatchState] = useState<MatchSSEState | null>(null)
  const [lastEvent, setLastEvent] = useState<MatchSSEEvent | null>(null)

  const eventSourceRef = useRef<EventSource | null>(null)
  const retriesRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(() => {
    if (!enabled || typeof window === 'undefined') {
      return
    }

    // Закрываем предыдущее подключение
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setStatus('connecting')

    const params = new URLSearchParams({ role })
    if (token) {
      params.set('token', token)
    }
    const url = `/api/match/${matchId}/sse?${params.toString()}`

    try {
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onopen = () => {
        setStatus('connected')
        retriesRef.current = 0
      }

      // Обработка типизированных событий
      const eventTypes: MatchEventType[] = [
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

      for (const eventType of eventTypes) {
        es.addEventListener(eventType, (event: MessageEvent) => {
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
        })
      }

      es.onerror = () => {
        setStatus('error')
        es.close()

        // Авто-переподключение (до 10 попыток)
        if (retriesRef.current < 10) {
          retriesRef.current++
          const delay = Math.min(3000 * retriesRef.current, 30000)
          reconnectTimeoutRef.current = setTimeout(connect, delay)
        } else {
          setStatus('disconnected')
        }
      }
    } catch {
      setStatus('error')
    }
  }, [matchId, role, token, enabled])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setStatus('disconnected')
  }, [])

  const reconnect = useCallback(() => {
    retriesRef.current = 0
    disconnect()
    connect()
  }, [connect, disconnect])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }
    return disconnect
  }, [enabled, connect, disconnect])

  return { status, matchState, lastEvent, reconnect }
}
