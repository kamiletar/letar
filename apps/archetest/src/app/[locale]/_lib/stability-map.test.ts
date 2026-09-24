import { describe, expect, it } from 'vitest'
import type { ScaleCode } from '../_data/personality-types'
import {
  computeMoodSplit,
  computeStabilityMap,
  MOOD_SPLIT_MIN_DIFF,
  STABILITY_MIN_N,
  type StabilitySession,
} from './stability-map'

/** Сессия с баллами по PAR/SZD; n — число релевантных ответов на шкалу */
function s(par: number, szd: number, n = 12, moodValence: number | null = null): StabilitySession {
  return {
    normalized: { PAR: par, SZD: szd } as Record<ScaleCode, number>,
    relevantCounts: { PAR: n, SZD: n } as Record<ScaleCode, number>,
    moodValence,
  }
}
const CODES: ScaleCode[] = ['PAR', 'SZD']

describe('computeStabilityMap', () => {
  it('меньше трёх сессий с данными — всё insufficient', () => {
    const map = computeStabilityMap([s(50, 50), s(55, 50)], CODES)
    expect(map.scales.map((r) => r.status)).toEqual(['insufficient', 'insufficient'])
  })

  it('перекрывающиеся интервалы — устойчиво; непересекающиеся — меняется', () => {
    const map = computeStabilityMap([s(50, 10, 40), s(55, 50, 40), s(52, 90, 40)], CODES)
    const by = Object.fromEntries(map.scales.map((r) => [r.code, r]))
    expect(by.PAR.status).toBe('stable')
    expect(by.SZD.status).toBe('shifting')
    expect(by.SZD).toMatchObject({ sessions: 3, min: 10, max: 90 })
  })

  it('тот же разброс на 3 ответах в порции — шум, а не смена состояния', () => {
    // 10 / 50 / 90 при n = 3: интервалы Уилсона широкие и имеют общую точку
    const map = computeStabilityMap(
      [s(0, 10, STABILITY_MIN_N), s(0, 50, STABILITY_MIN_N), s(0, 90, STABILITY_MIN_N)],
      CODES,
    )
    expect(map.scales.find((r) => r.code === 'SZD')!.status).toBe('stable')
  })

  it('сессии, где у шкалы меньше порога ответов, не участвуют', () => {
    const sessions = [s(50, 10, 40), s(50, 90, 40), {
      ...s(50, 50, 40),
      relevantCounts: { PAR: 40, SZD: 1 } as Record<ScaleCode, number>,
    }]
    const szd = computeStabilityMap(sessions, CODES).scales.find((r) => r.code === 'SZD')!
    expect(szd.status).toBe('insufficient')
    expect(szd.sessions).toBe(2)
  })

  it('eligibleSessions — сессии с баллами, пустые пропускаются', () => {
    const map = computeStabilityMap(
      [s(1, 1), { normalized: null, relevantCounts: null, moodValence: null }, s(1, 1)],
      CODES,
    )
    expect(map.eligibleSessions).toBe(2)
  })
})

describe('computeMoodSplit', () => {
  it('нужно минимум по две сессии в «грусти» и в «ресурсе»', () => {
    const split = computeMoodSplit([s(80, 10, 12, 1), s(80, 10, 12, 3), s(20, 10, 12, 3)], CODES)
    expect(split.available).toBe(false)
  })

  it('разница средних по порогу, сортировка по модулю, мелкие не показываются', () => {
    const split = computeMoodSplit(
      [
        s(80, 30, 12, 1),
        s(70, 30, 12, 1),
        s(20, 30 + MOOD_SPLIT_MIN_DIFF - 1, 12, 3),
        s(30, 30, 12, 3),
        s(50, 50, 12, 2),
      ],
      CODES,
    )
    expect(split).toMatchObject({ available: true, lowCount: 2, highCount: 2 })
    expect(split.scales).toEqual([{ code: 'PAR', low: 75, high: 25, diff: -50 }])
  })
})
