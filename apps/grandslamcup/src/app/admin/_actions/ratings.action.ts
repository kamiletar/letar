'use server'

/**
 * Пересчёт кэшированной таблицы PlayerRating
 *
 * Берёт все PlayerPerformance за сезон с totalScore != null,
 * группирует по playerId, upsert в PlayerRating.
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export const recalculateRatingsAction = adminGuard(async (seasonId: string) => {
  try {
    // Все перформансы за сезон
    const performances = await prisma.playerPerformance.findMany({
      where: {
        totalScore: { not: null },
        match: { tour: { round: { seasonId } } },
      },
      select: { playerId: true, totalScore: true },
    })

    // Группируем по playerId
    const byPlayer = new Map<string, number[]>()
    for (const p of performances) {
      const scores = byPlayer.get(p.playerId) ?? []
      scores.push(p.totalScore!)
      byPlayer.set(p.playerId, scores)
    }

    // Upsert PlayerRating для каждого игрока
    let updated = 0
    for (const [playerId, scores] of byPlayer) {
      const matchesPlayed = scores.length
      const totalScore = scores.reduce((sum, s) => sum + s, 0)
      const avgScore = Math.round((totalScore / matchesPlayed) * 100) / 100
      const bestScore = Math.max(...scores)

      await prisma.playerRating.upsert({
        where: { playerId_seasonId: { playerId, seasonId } },
        create: { playerId, seasonId, matchesPlayed, totalScore, avgScore, bestScore },
        update: { matchesPlayed, totalScore, avgScore, bestScore },
      })
      updated++
    }

    revalidatePath('/players')
    revalidatePath('/admin')

    return { success: true, updated, totalPerformances: performances.length }
  } catch (error) {
    console.error('[recalculateRatingsAction] ошибка:', error)
    return { error: 'Не удалось пересчитать рейтинги' }
  }
})
