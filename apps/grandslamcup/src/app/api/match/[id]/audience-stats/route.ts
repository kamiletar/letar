/**
 * API — статистика зрительского голосования
 *
 * GET /api/match/{id}/audience-stats
 * Возвращает средние баллы зрителей по каждому перформансу.
 * Используется проектором для показа "Мнения зала".
 */

import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string }>

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const { id: matchId } = await params

  const votes = await prisma.audienceVote.findMany({
    where: { matchId },
    select: {
      performanceId: true,
      textScore: true,
      deliveryScore: true,
    },
  })

  // Группируем по перформансу
  const byPerformance = new Map<string, { textScores: number[]; deliveryScores: number[] }>()

  for (const vote of votes) {
    const entry = byPerformance.get(vote.performanceId) ?? { textScores: [], deliveryScores: [] }
    entry.textScores.push(vote.textScore)
    entry.deliveryScores.push(vote.deliveryScore)
    byPerformance.set(vote.performanceId, entry)
  }

  // Считаем средние
  const stats = Object.fromEntries(
    [...byPerformance.entries()].map(([perfId, data]) => {
      const avgText = data.textScores.reduce((s, v) => s + v, 0) / data.textScores.length
      const avgDelivery = data.deliveryScores.reduce((s, v) => s + v, 0) / data.deliveryScores.length
      return [
        perfId,
        {
          votesCount: data.textScores.length,
          avgText: Math.round(avgText * 10) / 10,
          avgDelivery: Math.round(avgDelivery * 10) / 10,
          avgTotal: Math.round((avgText + avgDelivery) * 10) / 10,
        },
      ]
    })
  )

  return NextResponse.json({ data: stats, totalVoters: new Set(votes.map((v) => v.performanceId)).size })
}
