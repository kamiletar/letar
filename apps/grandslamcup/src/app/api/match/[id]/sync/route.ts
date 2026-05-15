/**
 * API endpoint для синхронизации оффлайн-операций счетовода.
 *
 * Вызывается:
 * 1. Клиентом через syncMatchOperations() при восстановлении связи
 * 2. Service Worker через Background Sync (Chromium)
 *
 * Принимает массив операций, выполняет последовательно, возвращает результаты.
 */

import { stopTimerAction } from '@/app/match/[id]/presenter/_actions/presenter.action'
import {
  endPerformanceAction,
  enterManualVoteAction,
  finishHalfAction,
  finishMatchAction,
  issueCardAction,
  nextRoundAction,
  setCurrentPerformerAction,
  startDeliveryVotingAction,
  startTextVotingAction,
} from '@/app/match/[id]/score/_actions/scorer.action'
import type { CardReason, CardType } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

type Params = Promise<{ id: string }>

interface SyncOperation {
  id: string
  matchId: string
  type: string
  payload: Record<string, unknown>
  createdAt: number
}

interface SyncRequest {
  operations: SyncOperation[]
  scorerToken?: string
}

export async function POST(request: Request, { params }: { params: Params }) {
  const { id: matchId } = await params

  let body: SyncRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Некорректный JSON' }, { status: 400 })
  }

  const { operations, scorerToken } = body

  if (!operations || !Array.isArray(operations) || operations.length === 0) {
    return NextResponse.json({ error: 'Нет операций' }, { status: 400 })
  }

  // Проверяем токен скорера
  if (scorerToken) {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { scorerToken: true },
    })
    if (!match || match.scorerToken !== scorerToken) {
      return NextResponse.json({ error: 'Неверный токен' }, { status: 403 })
    }
  }

  const synced: string[] = []
  const errors: Array<{ id: string; error: string }> = []

  // Выполняем операции последовательно (порядок важен!)
  for (const op of operations) {
    try {
      const result = await executeOperation(matchId, op)
      if (result.success) {
        synced.push(op.id)
      } else {
        errors.push({ id: op.id, error: result.error ?? 'Неизвестная ошибка' })
      }
    } catch (err) {
      errors.push({
        id: op.id,
        error: err instanceof Error ? err.message : 'Ошибка выполнения',
      })
      // Продолжаем — не ломаем всю цепочку из-за одной ошибки
    }
  }

  return NextResponse.json({ synced, errors })
}

/** Выполнить одну операцию, вызвав соответствующий server action */
async function executeOperation(matchId: string, op: SyncOperation): Promise<{ success: boolean; error?: string }> {
  const { type, payload } = op

  switch (type) {
    case 'ENTER_VOTE': {
      const result = await enterManualVoteAction(
        matchId,
        payload.performanceId as string,
        payload.judgeNumber as number,
        payload.dimension as 'TEXT' | 'DELIVERY',
        payload.score as number
      )
      return { success: !!result.success, error: 'error' in result ? String(result.error) : undefined }
    }

    case 'SET_PERFORMER': {
      const result = await setCurrentPerformerAction(
        matchId,
        payload.playerId as string,
        payload.playerName as string,
        payload.teamSeasonId as string,
        payload.teamName as string
      )
      return { success: !!result.success, error: 'error' in result ? String(result.error) : undefined }
    }

    case 'START_TEXT_VOTING': {
      const result = await startTextVotingAction(matchId)
      return { success: !!result.success, error: 'error' in result ? String(result.error) : undefined }
    }

    case 'START_DELIVERY_VOTING': {
      const result = await startDeliveryVotingAction(matchId)
      return { success: !!result.success, error: 'error' in result ? String(result.error) : undefined }
    }

    case 'NEXT_ROUND': {
      const result = await nextRoundAction(matchId)
      return { success: !!result.success, error: 'error' in result ? String(result.error) : undefined }
    }

    case 'ISSUE_CARD': {
      const result = await issueCardAction(
        matchId,
        payload.performanceId as string,
        payload.cardType as CardType,
        payload.cardReason as CardReason,
        (payload.note as string) || undefined
      )
      return { success: !!result.success, error: 'error' in result ? String(result.error) : undefined }
    }

    case 'FINISH_HALF': {
      const result = await finishHalfAction(matchId)
      return { success: !!result.success, error: 'error' in result ? String(result.error) : undefined }
    }

    case 'FINISH_MATCH': {
      const result = await finishMatchAction(matchId)
      return { success: !!result.success, error: 'error' in result ? String(result.error) : undefined }
    }

    case 'STOP_TIMER': {
      // Синхронизация остановки таймера — elapsedSec захвачен в момент нажатия кнопки
      const result = await stopTimerAction(matchId, payload.elapsedSec as number | undefined)
      return { success: !!result?.success, error: 'error' in result ? String(result.error) : undefined }
    }

    case 'END_PERFORMANCE': {
      // Синхронизация завершения выступления (с опциональным принудительным временем)
      const result = await endPerformanceAction(matchId, payload.forceDurationSec as number | undefined)
      return { success: !!result?.success, error: 'error' in result ? String(result.error) : undefined }
    }

    default:
      return { success: false, error: `Неизвестный тип операции: ${type}` }
  }
}
