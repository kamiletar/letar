/**
 * Расчёт статистики судейства для завершённого матча.
 * Средний балл, разброс, отклонение от среднего — по каждому судье.
 */

import { prisma } from '@/lib/db'

export interface JudgeStats {
  /** Имя судьи */
  name: string
  /** Номер судьи */
  judgeNumber: number
  /** Тайм */
  half: number
  /** Количество оценок */
  voteCount: number
  /** Средний балл */
  avgScore: number
  /** Минимальная оценка */
  minScore: number
  /** Максимальная оценка */
  maxScore: number
  /** Стандартное отклонение */
  stdDev: number
  /** Отклонение от среднего всех судей (%) */
  deviationPct: number
  /** Флаг: подозрительный разброс */
  isOutlier: boolean
}

export interface ControversialPerformance {
  /** Имя поэта */
  playerName: string
  /** Измерение (TEXT/DELIVERY) */
  dimension: string
  /** Мин оценка */
  minScore: number
  /** Макс оценка */
  maxScore: number
  /** Разброс */
  spread: number
}

export interface JudgeAnalyticsResult {
  /** Статистика по каждому судье */
  judges: JudgeStats[]
  /** Самые спорные выступления */
  controversial: ControversialPerformance[]
}

/** Расчёт аналитики судейства для матча */
export async function computeJudgeAnalytics(matchId: string): Promise<JudgeAnalyticsResult | null> {
  // Загружаем все голоса с сессиями
  const votes = await prisma.judgeVote.findMany({
    where: { judgeSession: { matchId } },
    include: {
      judgeSession: { select: { name: true, judgeNumber: true, half: true } },
      performance: {
        select: { player: { select: { name: true } } },
      },
    },
  })

  if (votes.length === 0) {
    return null
  }

  // Средний балл всех судей (для отклонения)
  const allScores = votes.map((v) => v.score)
  const globalAvg = allScores.reduce((s, v) => s + v, 0) / allScores.length

  // Группируем по судьям (sessionId → votes)
  const byJudge = new Map<string, typeof votes>()
  for (const v of votes) {
    const key = `${v.judgeSession.half}-${v.judgeSession.judgeNumber}`
    const group = byJudge.get(key) ?? []
    group.push(v)
    byJudge.set(key, group)
  }

  const judges: JudgeStats[] = []
  for (const [, judgeVotes] of byJudge) {
    const scores = judgeVotes.map((v) => v.score)
    const avg = scores.reduce((s, v) => s + v, 0) / scores.length
    const variance = scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length
    const stdDev = Math.sqrt(variance)
    const deviationPct = globalAvg > 0 ? Math.round(((avg - globalAvg) / globalAvg) * 100) : 0

    const first = judgeVotes[0].judgeSession
    judges.push({
      name: first.name,
      judgeNumber: first.judgeNumber,
      half: first.half,
      voteCount: scores.length,
      avgScore: Math.round(avg * 10) / 10,
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      stdDev: Math.round(stdDev * 100) / 100,
      deviationPct,
      // Подозрительный: σ < 0.3 (все одинаковые) или σ > 1.5 (хаотичные)
      isOutlier: stdDev < 0.3 || stdDev > 1.5 || Math.abs(deviationPct) > 30,
    })
  }

  // Сортировка: по тайму, потом по номеру
  judges.sort((a, b) => a.half - b.half || a.judgeNumber - b.judgeNumber)

  // Самые спорные выступления (макс разброс между судьями)
  const byPerf = new Map<string, typeof votes>()
  for (const v of votes) {
    const key = `${v.performanceId}-${v.dimension}`
    const group = byPerf.get(key) ?? []
    group.push(v)
    byPerf.set(key, group)
  }

  const controversial: ControversialPerformance[] = []
  for (const [, perfVotes] of byPerf) {
    const scores = perfVotes.map((v) => v.score)
    const spread = Math.max(...scores) - Math.min(...scores)
    if (spread >= 3) {
      controversial.push({
        playerName: perfVotes[0].performance.player.name,
        dimension: perfVotes[0].dimension,
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        spread,
      })
    }
  }

  controversial.sort((a, b) => b.spread - a.spread)

  return { judges, controversial: controversial.slice(0, 5) }
}
