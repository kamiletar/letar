'use server'

/**
 * Server actions для ручного редактирования оценок и результатов матча.
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Обновить оценки выступления вручную ===

const UpdateScoresSchema = z
  .object({
    performanceId: z.string().min(1),
    textScores: z.array(z.number().int().min(1).max(5)).length(5),
    deliveryScores: z.array(z.number().int().min(1).max(5)).length(5),
  })
  .strip()

/** Вычислить adjusted score (отброс мин/макс, сумма 3 средних) */
function adjustScores(scores: number[]): number {
  if (scores.length !== 5) {
    return 0
  }
  const sorted = [...scores].sort((a, b) => a - b)
  // Отбрасываем мин (sorted[0]) и макс (sorted[4])
  return sorted[1] + sorted[2] + sorted[3]
}

export const updatePerformanceScoresAction = adminGuard(async (input: unknown) => {
  const parsed = UpdateScoresSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные. Каждая оценка 1-5, ровно 5 судей.' }
  }

  const { performanceId, textScores, deliveryScores } = parsed.data

  const performance = await prisma.playerPerformance.findUnique({
    where: { id: performanceId },
    select: { matchId: true },
  })
  if (!performance) {
    return { error: 'Выступление не найдено' }
  }

  const textAdjusted = adjustScores(textScores)
  const deliveryAdjusted = adjustScores(deliveryScores)
  const totalScore = textAdjusted + deliveryAdjusted

  await prisma.playerPerformance.update({
    where: { id: performanceId },
    data: {
      textScores,
      deliveryScores,
      textAdjusted,
      deliveryAdjusted,
      totalScore,
    },
  })

  revalidatePath(`/admin/matches/${performance.matchId}`)
  return { success: true, textAdjusted, deliveryAdjusted, totalScore }
})

// === Обновить итоговый счёт матча вручную ===

const UpdateMatchScoreSchema = z
  .object({
    matchId: z.string().min(1),
    homeScore: z.number().min(0),
    awayScore: z.number().min(0),
  })
  .strip()

export const updateMatchScoreAction = adminGuard(async (input: unknown) => {
  const parsed = UpdateMatchScoreSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  await prisma.match.update({
    where: { id: parsed.data.matchId },
    data: {
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
    },
  })

  revalidatePath(`/admin/matches/${parsed.data.matchId}`)
  return { success: true }
})
