'use server'

/**
 * Server Actions для экрана судьи
 *
 * Регистрация судьи через QR-приглашение, отправка голосов.
 *
 * @module judge-actions
 */

import { prisma } from '@/lib/db'
import { COLOR_ORDER, type JudgeColor } from '@/lib/judge-colors'
import { calculateAdjusted, calculateTotal, isValidScore, JUDGES_COUNT } from '@/lib/scoring'
import { broadcastMatchEvent, broadcastState } from '@/lib/sse/broadcast'
import { getMatchState, updateMatchState } from '@/lib/sse/match-state'
import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'

// === Регистрация судьи (с очередью и цветами) ===

export async function registerJudgeAction(matchId: string, half: number, inviteKey: string, name: string) {
  // Проверяем invite key
  const state = getMatchState(matchId)
  if (state.inviteKey !== inviteKey) {
    return { success: false, error: 'Неверная ссылка приглашения. Попросите скорера показать новый QR-код.' }
  }

  // Получаем или создаём fingerprint (cookie на 30 дней)
  const cookieStore = await cookies()
  let fingerprint = cookieStore.get('judge_fingerprint')?.value
  if (!fingerprint) {
    fingerprint = randomUUID()
    cookieStore.set('judge_fingerprint', fingerprint, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 дней
    })
  }

  // Блокировка: fingerprint был отведён в этом тайме
  if (state.recusedFingerprints.includes(fingerprint)) {
    return { success: false, error: 'Вы уже были отведены в этом тайме и не можете снова подать заявку на судейство' }
  }

  // Проверяем: fingerprint уже судил в этом матче?
  const duplicateByFingerprint = await prisma.judgeSession.findFirst({
    where: { matchId, fingerprint },
  })

  // Блокировка: fingerprint уже зарегистрирован в ТЕКУЩЕМ тайме
  if (duplicateByFingerprint && duplicateByFingerprint.half === half) {
    return {
      success: false,
      error: `Это устройство уже зарегистрировано как судья №${duplicateByFingerprint.judgeNumber} в этом тайме`,
    }
  }

  // Проверяем: имя уже судило в предыдущем тайме?
  let duplicateByName = false
  if (half === 2) {
    const previousSession = await prisma.judgeSession.findFirst({
      where: {
        matchId,
        half: 1,
        name: { equals: name, mode: 'insensitive' },
      },
    })
    if (previousSession) {
      duplicateByName = true
    }
  }

  // Формируем предупреждения для скорера
  const warnings: string[] = []
  if (duplicateByFingerprint) {
    warnings.push(
      `Устройство ${name} уже использовалось для судейства (тайм ${duplicateByFingerprint.half}, судья #${duplicateByFingerprint.judgeNumber})`,
    )
  }
  if (duplicateByName) {
    warnings.push(`${name} уже был(а) судьёй в 1-м тайме`)
  }

  // Определяем: активный судья или в очередь?
  const isActive = state.judges.length < JUDGES_COUNT
  const judgeNumber = isActive ? state.judges.length + 1 : state.judges.length + state.judgeQueue.length + 1
  const color: JudgeColor | null = isActive ? COLOR_ORDER[state.judges.length] : null
  const queuePosition = isActive ? null : state.judgeQueue.length + 1

  // Создаём сессию в БД
  const session = await prisma.judgeSession.create({
    data: {
      matchId,
      half,
      name,
      judgeNumber,
      color: color ?? undefined,
      status: isActive ? 'ACTIVE' : 'QUEUED',
      queuePosition,
      fingerprint,
    },
  })

  // Устанавливаем cookie
  cookieStore.set('judge_token', session.token, {
    httpOnly: true,
    sameSite: 'lax',
    path: `/match/${matchId}`,
    maxAge: 60 * 60 * 6, // 6 часов
  })

  // Обновляем in-memory
  updateMatchState(matchId, (s) => {
    if (isActive && color) {
      s.judges.push({
        sessionId: session.id,
        name,
        judgeNumber,
        color,
        hasVoted: false,
      })
    } else {
      s.judgeQueue.push({
        sessionId: session.id,
        name,
        position: queuePosition!,
      })
    }
  })

  if (isActive) {
    broadcastMatchEvent(matchId, 'judge:connected', {
      name,
      judgeNumber,
      color,
      totalJudges: state.judges.length + 1,
      warnings: warnings.length > 0 ? warnings : undefined,
    })
  } else {
    broadcastMatchEvent(matchId, 'judge:queued', {
      name,
      queuePosition,
      totalQueue: state.judgeQueue.length + 1,
      warnings: warnings.length > 0 ? warnings : undefined,
    })
  }
  broadcastState(matchId)

  return {
    success: true,
    judgeNumber,
    color,
    isQueued: !isActive,
    queuePosition,
    token: session.token,
    warnings,
  }
}

// === Отправка голоса ===

export async function submitVoteAction(
  matchId: string,
  performanceId: string,
  dimension: 'TEXT' | 'DELIVERY',
  score: number,
) {
  if (!isValidScore(score)) {
    return { success: false, error: 'Оценка должна быть от 1 до 5' }
  }

  // Проверка серверного таймаута голосования (45 сек с запасом)
  const state = getMatchState(matchId)
  if (state.votingOpenedAt) {
    const elapsedMs = Date.now() - state.votingOpenedAt
    if (elapsedMs > 45_000) {
      return { success: false, error: 'Время голосования истекло' }
    }
  }

  // Получаем токен судьи из cookie
  const cookieStore = await cookies()
  const judgeToken = cookieStore.get('judge_token')?.value
  if (!judgeToken) {
    return { success: false, error: 'Нет авторизации судьи' }
  }

  // Находим сессию
  const session = await prisma.judgeSession.findUnique({
    where: { token: judgeToken },
    select: { id: true, matchId: true, judgeNumber: true, name: true },
  })

  if (!session || session.matchId !== matchId) {
    return { success: false, error: 'Неверная сессия судьи' }
  }

  // Сохраняем или обновляем голос (upsert для возможности изменения)
  try {
    await prisma.judgeVote.upsert({
      where: {
        judgeSessionId_performanceId_dimension: {
          judgeSessionId: session.id,
          performanceId,
          dimension,
        },
      },
      create: {
        judgeSessionId: session.id,
        performanceId,
        dimension,
        score,
      },
      update: { score },
    })
  } catch {
    return { success: false, error: 'Ошибка при сохранении голоса' }
  }

  // Обновляем in-memory: статус голосования и оценка
  updateMatchState(matchId, (s) => {
    const judge = s.judges.find((j) => j.sessionId === session.id)
    if (judge) {
      judge.hasVoted = true
    }
    s.currentVoteScores[session.judgeNumber] = score
  })

  broadcastMatchEvent(matchId, 'vote:received', {
    judgeNumber: session.judgeNumber,
    judgeName: session.name,
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

  broadcastState(matchId)

  return { success: true, judgeNumber: session.judgeNumber }
}

// === Обработка когда все 5 судей проголосовали ===

async function handleAllVotesComplete(matchId: string, performanceId: string, dimension: 'TEXT' | 'DELIVERY') {
  const votes = await prisma.judgeVote.findMany({
    where: { performanceId, dimension },
    orderBy: { createdAt: 'asc' },
  })

  const scores = votes.map((v) => v.score)
  const adjusted = calculateAdjusted(scores)
  if (adjusted === null) {
    return
  }

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
}
