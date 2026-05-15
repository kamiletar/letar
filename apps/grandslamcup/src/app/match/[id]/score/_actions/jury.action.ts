'use server'

/**
 * Управление жюри: генерация QR-инвайтов, ручное управление слотами.
 */

import { prisma } from '@/lib/db'
import { broadcastMatchEvent, broadcastState } from '@/lib/sse/broadcast'
import { getMatchState, updateMatchState } from '@/lib/sse/match-state'
import { randomUUID } from 'crypto'

/** Генерация QR для жюри */
export async function createJuryInviteAction(matchId: string, half: number) {
  const inviteKey = randomUUID()

  updateMatchState(matchId, (state) => {
    state.inviteKey = inviteKey
    state.currentHalf = half
    state.judges = [] // Сбрасываем судей для нового тайма
    // Выходим из INTERMISSION → wizard перейдёт на SELECT_JURY
    state.phase = 'IDLE'
  })

  broadcastState(matchId) // Уведомляем клиентов — wizard перейдёт на SELECT_JURY

  return { success: true, inviteKey, half }
}

/**
 * Отметить слот как «управляется вручную» — счётовод будет вводить оценки
 * за этого судью через интерфейс скорера (reality: у судьи нет телефона или
 * не хочет регистрироваться).
 *
 * Ручной судья не имеет цвета (его телефон не светится) и имеет служебное
 * имя «Слот N». Создаёт JudgeSession в БД чтобы enterManualVoteAction мог
 * с ним работать как с обычным судьёй.
 */
export async function assignManualJudgeAction(matchId: string, judgeNumber: number) {
  try {
    if (judgeNumber < 1 || judgeNumber > 5) {
      return { success: false as const, error: 'Номер слота должен быть от 1 до 5' }
    }

    const state = getMatchState(matchId)

    // Проверяем что слот свободен
    if (state.judges.some((j) => j.judgeNumber === judgeNumber)) {
      return { success: false as const, error: `Слот ${judgeNumber} уже занят` }
    }

    const name = `Слот ${judgeNumber}`

    // Создаём JudgeSession в БД (color = null, т.к. цвет используется только для телефонов судей)
    const session = await prisma.judgeSession.create({
      data: {
        matchId,
        half: state.currentHalf,
        name,
        judgeNumber,
        color: null,
        status: 'ACTIVE',
        fingerprint: `manual-${randomUUID()}`,
      },
    })

    updateMatchState(matchId, (s) => {
      s.judges.push({
        sessionId: session.id,
        name,
        judgeNumber,
        color: null,
        hasVoted: false,
        manual: true,
      })
      // Сортируем слоты по номеру для стабильного отображения
      s.judges.sort((a, b) => a.judgeNumber - b.judgeNumber)
    })

    broadcastMatchEvent(matchId, 'judge:connected', {
      name,
      judgeNumber,
      manual: true,
    })
    broadcastState(matchId)

    return { success: true as const, judgeNumber }
  } catch (error) {
    console.error('[assignManualJudgeAction] ошибка:', error)
    return { success: false as const, error: 'Не удалось назначить слот вручную' }
  }
}

/**
 * Снять ручную пометку со слота — удаляет JudgeSession и убирает судью из matchState.
 * Слот становится снова свободным для регистрации через QR.
 */
export async function removeManualJudgeAction(matchId: string, judgeNumber: number) {
  try {
    const state = getMatchState(matchId)
    const judge = state.judges.find((j) => j.judgeNumber === judgeNumber)
    if (!judge) {
      return { success: false as const, error: `Слот ${judgeNumber} пуст` }
    }
    if (!judge.manual) {
      return { success: false as const, error: 'Этот слот занят судьёй через QR, снять нельзя' }
    }

    // Удаляем JudgeSession и её голоса (cascade через schema onDelete)
    await prisma.judgeSession.delete({
      where: { id: judge.sessionId },
    })

    updateMatchState(matchId, (s) => {
      s.judges = s.judges.filter((j) => j.judgeNumber !== judgeNumber)
    })

    broadcastState(matchId)

    return { success: true as const }
  } catch (error) {
    console.error('[removeManualJudgeAction] ошибка:', error)
    return { success: false as const, error: 'Не удалось снять ручную пометку' }
  }
}
