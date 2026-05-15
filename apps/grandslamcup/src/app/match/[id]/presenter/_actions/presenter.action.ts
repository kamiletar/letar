'use server'

/**
 * Server Actions для экрана ведущего
 *
 * Таймер выступления (старт/стоп/сброс), отмена голосования.
 * Управление голосованием переиспользует actions из scorer.action.ts.
 *
 * @module presenter-actions
 */

import { prisma } from '@/lib/db'
import { broadcastMatchEvent, broadcastState } from '@/lib/sse/broadcast'
import { getMatchState, updateMatchState } from '@/lib/sse/match-state'

// === Таймер выступления ===

/** Запустить таймер выступления */
export async function startTimerAction(matchId: string) {
  try {
    const state = getMatchState(matchId)
    if (state.timer.isRunning) {
      return { success: false, error: 'Таймер уже запущен' }
    }

    // Привязываем к текущему перформансу
    const currentPerf = state.currentPerformances[state.currentPerformerIndex]

    updateMatchState(matchId, (s) => {
      s.timer.isRunning = true
      s.timer.startedAt = Date.now()
      s.timer.performanceId = currentPerf?.performanceId ?? null
    })

    broadcastMatchEvent(matchId, 'timer:started', {
      startedAt: Date.now(),
      accumulatedSec: state.timer.accumulatedSec,
      performanceId: currentPerf?.performanceId ?? null,
    })
    broadcastState(matchId)

    return { success: true }
  } catch (error) {
    console.error('[startTimerAction] ошибка:', error)
    return { success: false, error: 'Не удалось запустить таймер' }
  }
}

/**
 * Остановить таймер выступления.
 * @param clientElapsedSec — elapsed в момент клика на клиенте (компенсирует сетевую задержку)
 */
export async function stopTimerAction(matchId: string, clientElapsedSec?: number) {
  try {
    const state = getMatchState(matchId)
    if (!state.timer.isRunning || !state.timer.startedAt) {
      return { success: false, error: 'Таймер не запущен' }
    }

    // Используем клиентское время если передано и разумно (не более 5с от серверного)
    const serverElapsed = (Date.now() - state.timer.startedAt) / 1000
    const elapsed =
      clientElapsedSec !== undefined && Math.abs(clientElapsedSec - serverElapsed) < 5
        ? clientElapsedSec
        : serverElapsed
    const totalSec = Math.round(state.timer.accumulatedSec + elapsed)

    updateMatchState(matchId, (s) => {
      s.timer.isRunning = false
      s.timer.accumulatedSec = totalSec
      s.timer.startedAt = null
    })

    // Сохраняем durationSec в БД если есть привязанный перформанс
    if (state.timer.performanceId) {
      await prisma.playerPerformance.update({
        where: { id: state.timer.performanceId },
        data: { durationSec: totalSec },
      })
    }

    broadcastMatchEvent(matchId, 'timer:stopped', {
      accumulatedSec: totalSec,
      performanceId: state.timer.performanceId,
    })
    broadcastState(matchId)

    return { success: true, durationSec: totalSec }
  } catch (error) {
    console.error('[stopTimerAction] ошибка:', error)
    return { success: false, error: 'Не удалось остановить таймер' }
  }
}

/** Сбросить таймер выступления */
export async function resetTimerAction(matchId: string) {
  try {
    updateMatchState(matchId, (s) => {
      s.timer.isRunning = false
      s.timer.startedAt = null
      s.timer.accumulatedSec = 0
      s.timer.performanceId = null
    })

    broadcastMatchEvent(matchId, 'timer:reset', {})
    broadcastState(matchId)

    return { success: true }
  } catch (error) {
    console.error('[resetTimerAction] ошибка:', error)
    return { success: false, error: 'Не удалось сбросить таймер' }
  }
}

// === Отмена голосования ===

/** Отменить текущее голосование и откатить фазу */
export async function cancelVotingAction(matchId: string) {
  try {
    const state = getMatchState(matchId)

    // Определяем dimension по текущей фазе
    let dimension: 'TEXT' | 'DELIVERY'
    if (state.phase === 'TEXT_VOTING') {
      dimension = 'TEXT'
    } else if (state.phase === 'DELIVERY_VOTING') {
      dimension = 'DELIVERY'
    } else {
      return { success: false, error: `Нельзя отменить голосование в фазе ${state.phase}` }
    }

    // Находим текущий перформанс
    const currentPerf = state.currentPerformances[state.currentPerformerIndex]
    if (!currentPerf) {
      return { success: false, error: 'Нет текущего выступления' }
    }

    // Удаляем все голоса за текущую dimension этого перформанса
    await prisma.judgeVote.deleteMany({
      where: {
        performanceId: currentPerf.performanceId,
        dimension,
      },
    })

    // Откатываем фазу
    const previousPhase = dimension === 'TEXT' ? 'IDLE' : 'TEXT_COMPLETE'

    updateMatchState(matchId, (s) => {
      s.phase = previousPhase as typeof s.phase
      s.votingOpenedAt = null
      // Сбрасываем hasVoted у всех судей
      s.judges.forEach((j) => {
        j.hasVoted = false
      })
    })

    broadcastMatchEvent(matchId, 'voting:cancelled', {
      dimension,
      performanceId: currentPerf.performanceId,
      rolledBackTo: previousPhase,
    })
    broadcastState(matchId)

    return { success: true, previousPhase }
  } catch (error) {
    console.error('[cancelVotingAction] ошибка:', error)
    return { success: false, error: 'Не удалось отменить голосование' }
  }
}

// === Toggle отвода судьи ===

/** Включить/выключить возможность отвода судьи тренерами */
export async function toggleJudgeRecusalAction(matchId: string, allowed: boolean) {
  try {
    updateMatchState(matchId, (s) => {
      s.judgeRecusalAllowed = allowed
    })

    broadcastMatchEvent(matchId, 'phase:changed', {})
    broadcastState(matchId)

    return { success: true, allowed }
  } catch (error) {
    console.error('[toggleJudgeRecusalAction] ошибка:', error)
    return { success: false, error: 'Не удалось изменить настройку' }
  }
}

// === Отвод конкретного судьи (одобрение запроса тренера) ===

/** Одобрить отвод судьи по цвету + автозамена из очереди */
export async function approveJudgeRecusalAction(matchId: string, judgeColor: string) {
  try {
    const state = getMatchState(matchId)
    const judge = state.judges.find((j) => j.color === judgeColor)
    if (!judge) {
      return { success: false, error: `Судья с цветом ${judgeColor} не найден` }
    }

    const freedColor = judge.color
    const freedNumber = judge.judgeNumber

    // Обновляем статус в БД
    await prisma.judgeSession.update({
      where: { id: judge.sessionId },
      data: { status: 'RECUSED' },
    })

    let replacement: { name: string; sessionId: string } | null = null

    updateMatchState(matchId, (s) => {
      // Удаляем отведённого судью
      s.judges = s.judges.filter((j) => j.color !== judgeColor)

      // Добавляем fingerprint в блоклист (не может снова подать заявку в этом тайме)
      // Fingerprint берём из БД (через sessionId) — но для in-memory достаточно
      // запомнить, что этот судья отведён. Fingerprint проверяется при регистрации.
      // Здесь записываем sessionId для трекинга.

      // Автозамена: берём первого из очереди
      if (s.judgeQueue.length > 0) {
        const next = s.judgeQueue.shift()!
        replacement = { name: next.name, sessionId: next.sessionId }

        // Промоутим из очереди в активные судьи с освободившимся цветом
        s.judges.push({
          sessionId: next.sessionId,
          name: next.name,
          judgeNumber: freedNumber,
          color: freedColor,
          hasVoted: false,
        })

        // Пересчитываем позиции оставшихся в очереди
        s.judgeQueue.forEach((q, i) => {
          q.position = i + 1
        })
      }
    })

    // Обновляем замену в БД
    if (replacement) {
      await prisma.judgeSession.update({
        where: { id: replacement.sessionId },
        data: {
          status: 'ACTIVE',
          color: freedColor as 'RED' | 'BLUE' | 'GREEN' | 'YELLOW' | 'PURPLE',
          judgeNumber: freedNumber,
          queuePosition: null,
        },
      })
    }

    // Получаем fingerprint отведённого судьи для блоклиста
    const recusedSession = await prisma.judgeSession.findUnique({
      where: { id: judge.sessionId },
      select: { fingerprint: true },
    })
    if (recusedSession?.fingerprint) {
      updateMatchState(matchId, (s) => {
        if (!s.recusedFingerprints.includes(recusedSession.fingerprint!)) {
          s.recusedFingerprints.push(recusedSession.fingerprint!)
        }
      })
    }

    broadcastMatchEvent(matchId, 'judge:recused', {
      judgeNumber: freedNumber,
      judgeColor,
      judgeName: judge.name,
      replacement: replacement ? { name: replacement.name, color: freedColor } : null,
    })
    broadcastState(matchId)

    return {
      success: true,
      judgeName: judge.name,
      judgeColor,
      replacement: replacement?.name ?? null,
    }
  } catch (error) {
    console.error('[approveJudgeRecusalAction] ошибка:', error)
    return { success: false, error: 'Не удалось отвести судью' }
  }
}

// === Жеребьёвка первой команды ===

/** Случайный выбор, какая команда начинает тайм */
export async function coinFlipAction(matchId: string) {
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { include: { team: { select: { name: true } } } },
        awayTeam: { include: { team: { select: { name: true } } } },
      },
    })

    if (!match) {
      return { success: false, error: 'Матч не найден' }
    }

    // Случайный выбор
    const isHome = Math.random() < 0.5
    const startingTeam = isHome ? match.homeTeam.team.name : match.awayTeam.team.name
    const side = isHome ? 'home' : 'away'

    broadcastMatchEvent(matchId, 'coin:flipped', {
      startingSide: side,
      startingTeam,
    })

    return { success: true, startingTeam, side }
  } catch (error) {
    console.error('[coinFlipAction] ошибка:', error)
    return { success: false, error: 'Не удалось провести жеребьёвку' }
  }
}
