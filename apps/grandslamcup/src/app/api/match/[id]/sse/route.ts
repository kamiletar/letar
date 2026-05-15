/**
 * SSE endpoint для live scoring матча
 *
 * Клиенты подключаются с параметрами роли и токена:
 * - ?role=scorer&token=xxx — скорер
 * - ?role=presenter&token=xxx — ведущий
 * - ?role=coach&token=xxx — тренер (homeCoachToken или awayCoachToken)
 * - ?role=judge&token=xxx — судья (cookie-токен JudgeSession)
 * - ?role=public — без авторизации (зритель)
 *
 * @module match-sse-route
 */

import { prisma } from '@/lib/db'
import { getMatchSSEManager } from '@/lib/sse/match-sse-manager'
import { getMatchState } from '@/lib/sse/match-state'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { id: matchId } = await params
  const { searchParams } = request.nextUrl
  const role = searchParams.get('role') ?? 'public'
  const token = searchParams.get('token')

  // Проверяем существование матча
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      scorerToken: true,
      presenterToken: true,
      homeCoachToken: true,
      awayCoachToken: true,
      status: true,
    },
  })

  if (!match) {
    return NextResponse.json({ error: 'Матч не найден' }, { status: 404 })
  }

  // Валидация токена по роли
  if (role === 'scorer' && token !== match.scorerToken) {
    return NextResponse.json({ error: 'Неверный токен скорера' }, { status: 403 })
  }
  if (role === 'presenter' && token !== match.presenterToken) {
    return NextResponse.json({ error: 'Неверный токен ведущего' }, { status: 403 })
  }
  if (role === 'coach' && token !== match.homeCoachToken && token !== match.awayCoachToken) {
    return NextResponse.json({ error: 'Неверный токен тренера' }, { status: 403 })
  }
  if (role === 'judge') {
    // Судья авторизуется по cookie-токену
    const judgeToken = request.cookies.get('judge_token')?.value ?? token
    if (!judgeToken) {
      return NextResponse.json({ error: 'Нет токена судьи' }, { status: 403 })
    }
    const session = await prisma.judgeSession.findUnique({
      where: { token: judgeToken },
      select: { matchId: true },
    })
    if (!session || session.matchId !== matchId) {
      return NextResponse.json({ error: 'Неверный токен судьи' }, { status: 403 })
    }
  }

  // Получаем SSE менеджер и канал
  const sseManager = getMatchSSEManager()
  const channel = `match:${matchId}`
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Подписываемся на канал
      const subscribed = sseManager.subscribe(channel, controller)
      if (!subscribed) {
        controller.close()
        return
      }

      // Отправляем начальное состояние (полное — для восстановления после рефреша)
      const state = getMatchState(matchId)
      const initData = {
        type: 'phase:changed' as const,
        payload: {
          phase: state.phase,
          currentHalf: state.currentHalf,
          currentRound: state.currentRound,
          inviteKey: state.inviteKey,
          judges: state.judges.map((j) => ({
            sessionId: j.sessionId,
            name: j.name,
            judgeNumber: j.judgeNumber,
            hasVoted: j.hasVoted,
            color: j.color,
            manual: j.manual,
          })),
          currentPerformances: state.currentPerformances,
          currentPerformerIndex: state.currentPerformerIndex,
          timer: state.timer,
          votingOpenedAt: state.votingOpenedAt,
          judgeRecusalAllowed: state.judgeRecusalAllowed,
          currentVoteScores: state.currentVoteScores,
        },
        timestamp: Date.now(),
      }
      controller.enqueue(encoder.encode(`event: phase:changed\ndata: ${JSON.stringify(initData)}\n\n`))

      // Очистка при отключении
      request.signal.addEventListener('abort', () => {
        sseManager.unsubscribe(controller)
        try {
          controller.close()
        } catch {
          // Игнорируем ошибки при закрытии
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
