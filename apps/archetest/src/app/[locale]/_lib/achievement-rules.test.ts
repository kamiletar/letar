import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS } from '../_data/achievements'
import { ALL_SCALE_CODES } from '../_data/personality-types'
import {
  type AchievementContext,
  type AchievementSession,
  checkAchievement,
  FULL_MAP_COVERAGE,
  getTop3,
  getTopType,
  normalizeSessionScores,
} from './achievement-rules'

const DAY = 24 * 60 * 60 * 1000
const T0 = new Date('2026-01-01T12:00:00')

/** Сессия: баллы — сырые (как в БД), answeredCount по умолчанию 50 */
function session(
  dayOffset: number,
  raw: Record<string, number> | null = null,
  extra: Partial<AchievementSession> = {},
) {
  const at = new Date(T0.getTime() + dayOffset * DAY)
  return {
    scores: raw ? JSON.stringify(raw) : null,
    answeredCount: 50,
    completedAt: at,
    createdAt: at,
    moodValence: null,
    moodEnergy: null,
    ...extra,
  } satisfies AchievementSession
}

function ctx(over: Partial<AchievementContext> = {}): AchievementContext {
  return {
    sessionsCount: 1,
    totalAnswers: 50,
    currentScores: { PAR: 50 },
    allSessions: [session(0)],
    existingAchievements: [],
    completedAt: T0,
    cumulativeCoverage: {},
    ...over,
  }
}

/** Сырые баллы, которые при 50 ответах нормализуются в нужные проценты (max = 150) */
const raw = (pct: Record<string, number>) =>
  Object.fromEntries(Object.entries(pct).map(([k, v]) => [k, (v * 150) / 100]))

describe('справочник ↔ правила', () => {
  it('у каждой ачивки есть правило: в «идеальном» контексте все разблокируемы по отдельности', () => {
    // Для каждого кода подбираем контекст, где он должен выполняться — ни один не остаётся на default: false
    const reachable: Record<string, AchievementContext> = {
      FIRST_QUIZ: ctx(),
      SESSIONS_3: ctx({ sessionsCount: 3 }),
      SESSIONS_5: ctx({ sessionsCount: 5 }),
      SESSIONS_10: ctx({ sessionsCount: 10 }),
      SESSIONS_25: ctx({ sessionsCount: 25 }),
      FULL_QUIZ: ctx(),
      TOTAL_500: ctx({ totalAnswers: 500 }),
      TOTAL_1000: ctx({ totalAnswers: 1000 }),
      DOMINANT_80: ctx({ currentScores: { PAR: 80 } }),
      BALANCED: ctx({ currentScores: { PAR: 40, SZD: 30 } }),
      TYPE_SHIFT: ctx({
        currentScores: { SZD: 90, PAR: 10 },
        allSessions: [session(7, raw({ SZD: 90 })), session(0, raw({ PAR: 90 }))],
      }),
      STABLE_PROFILE: ctx({
        allSessions: [0, 1, 2].map((d) => session(d, raw({ PAR: 80, SZD: 70, OBC: 60, NAR: 10 }))),
      }),
      NIGHT_OWL: ctx({ completedAt: new Date('2026-01-01T03:00:00') }),
      EARLY_BIRD: ctx({ completedAt: new Date('2026-01-01T06:00:00') }),
      THREE_MOODS: ctx({ allSessions: [1, 2, 3].map((v) => session(v, null, { moodValence: v, moodEnergy: 2 })) }),
      RETURN_30: ctx({ allSessions: [session(40), session(0)] }),
      SPACING_SERIES: ctx({ allSessions: [0, 7, 14, 21].map((d) => session(d)) }),
      FULL_MAP: ctx({ cumulativeCoverage: Object.fromEntries(ALL_SCALE_CODES.map((c) => [c, FULL_MAP_COVERAGE])) }),
    }
    expect(Object.keys(reachable).sort()).toEqual(ACHIEVEMENTS.map((a) => a.code).sort())
    for (const [code, c] of Object.entries(reachable)) {
      expect(checkAchievement(code, c), code).toBe(true)
    }
  })

  it('неизвестный код — никогда', () => {
    expect(checkAchievement('NO_SUCH', ctx({ sessionsCount: 100 }))).toBe(false)
  })
})

describe('пороги и границы', () => {
  it('счётчики сессий и ответов — включительно', () => {
    expect(checkAchievement('SESSIONS_3', ctx({ sessionsCount: 2 }))).toBe(false)
    expect(checkAchievement('TOTAL_500', ctx({ totalAnswers: 499 }))).toBe(false)
  })

  it('FULL_QUIZ — только полная порция из 50', () => {
    expect(checkAchievement('FULL_QUIZ', ctx({ allSessions: [session(0, null, { answeredCount: 49 })] }))).toBe(false)
  })

  it('BALANCED ломается одной шкалой вне 20–60', () => {
    expect(checkAchievement('BALANCED', ctx({ currentScores: { PAR: 40, SZD: 61 } }))).toBe(false)
    expect(checkAchievement('BALANCED', ctx({ currentScores: { PAR: 19, SZD: 40 } }))).toBe(false)
  })

  it('DOMINANT_80 и BALANCED смотрят только на шкалы ядра — скрытые экспериментальные не в счёт', () => {
    // Экспериментальные шкалы пользователю не показываются: ачивка «за доминанту», которую он не видит,
    // и «баланс», сорванный невидимой шкалой, — ошибка
    expect(checkAchievement('DOMINANT_80', ctx({ currentScores: { PAR: 50, RES_AFF: 90 } }))).toBe(false)
    expect(checkAchievement('BALANCED', ctx({ currentScores: { PAR: 40, SZD: 30, RES_PHYS: 5, SPEC_INT: 95 } }))).toBe(
      true,
    )
  })

  it('NIGHT_OWL [0; 5), EARLY_BIRD [5; 7) по местному времени сервера', () => {
    const at = (h: number) => new Date(`2026-01-01T${String(h).padStart(2, '0')}:30:00`)
    expect(checkAchievement('NIGHT_OWL', ctx({ completedAt: at(4) }))).toBe(true)
    expect(checkAchievement('NIGHT_OWL', ctx({ completedAt: at(5) }))).toBe(false)
    expect(checkAchievement('EARLY_BIRD', ctx({ completedAt: at(7) }))).toBe(false)
  })

  it('TYPE_SHIFT: одинаковый топ или меньше двух завершённых сессий → нет', () => {
    const same = [session(7, raw({ PAR: 90 })), session(0, raw({ PAR: 80 }))]
    expect(checkAchievement('TYPE_SHIFT', ctx({ currentScores: { PAR: 90 }, allSessions: same }))).toBe(false)
    expect(
      checkAchievement('TYPE_SHIFT', ctx({ currentScores: { SZD: 90 }, allSessions: [session(0, raw({ PAR: 90 }))] })),
    ).toBe(false)
  })

  it('STABLE_PROFILE: топ-3 сравнивается как множество, порядок внутри неважен', () => {
    const a = session(2, raw({ PAR: 80, SZD: 70, OBC: 60 }))
    const b = session(1, raw({ OBC: 80, PAR: 70, SZD: 60 }))
    const c = session(0, raw({ SZD: 80, OBC: 70, PAR: 60 }))
    expect(checkAchievement('STABLE_PROFILE', ctx({ allSessions: [a, b, c] }))).toBe(true)
    const d = session(0, raw({ SZD: 80, OBC: 70, NAR: 65 }))
    expect(checkAchievement('STABLE_PROFILE', ctx({ allSessions: [a, b, d] }))).toBe(false)
  })

  it('THREE_MOODS: считаются различные пары, пропуски чек-ина не в счёт', () => {
    const same = [1, 2, 3].map((d) => session(d, null, { moodValence: 1, moodEnergy: 1 }))
    expect(checkAchievement('THREE_MOODS', ctx({ allSessions: same }))).toBe(false)
    const withSkips = [
      session(1, null, { moodValence: 1, moodEnergy: 1 }),
      session(2, null, { moodValence: 2, moodEnergy: 1 }),
      session(3),
    ]
    expect(checkAchievement('THREE_MOODS', ctx({ allSessions: withSkips }))).toBe(false)
  })

  it('RETURN_30 и SPACING_SERIES не зависят от порядка сессий на входе', () => {
    expect(checkAchievement('RETURN_30', ctx({ allSessions: [session(0), session(29)] }))).toBe(false)
    const shuffled = [21, 0, 14, 7].map((d) => session(d))
    expect(checkAchievement('SPACING_SERIES', ctx({ allSessions: shuffled }))).toBe(true)
    const oneShortGap = [0, 7, 13, 20].map((d) => session(d))
    expect(checkAchievement('SPACING_SERIES', ctx({ allSessions: oneShortGap }))).toBe(false)
  })

  it('FULL_MAP: одной шкалы ниже порога достаточно, чтобы не открыть', () => {
    const cov = Object.fromEntries(ALL_SCALE_CODES.map((c) => [c, 1]))
    cov[ALL_SCALE_CODES[0]] = FULL_MAP_COVERAGE - 0.01
    expect(checkAchievement('FULL_MAP', ctx({ cumulativeCoverage: cov }))).toBe(false)
  })
})

describe('вспомогательные', () => {
  it('топ-тип и топ-3 — только шкалы ядра, экспериментальные коды игнорируются', () => {
    const scores = { RES_PHYS: 99, PAR: 50, SZD: 40, OBC: 30, NAR: 20 }
    expect(getTopType(scores)).toBe('PAR')
    expect(getTop3(scores)).toEqual(['PAR', 'SZD', 'OBC'])
  })

  it('нормализация сырых баллов: процент от 3 × ответов, без ответов — ноль', () => {
    expect(normalizeSessionScores(JSON.stringify({ PAR: 75 }), 50)).toEqual({ PAR: 50 })
    expect(normalizeSessionScores(JSON.stringify({ PAR: 10 }), 0)).toEqual({ PAR: 0 })
  })
})
