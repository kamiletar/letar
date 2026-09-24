import type { ScaleCode } from '../_data/personality-types'
import { computeDarkCore, type DarkCoreStructure } from './dark-core'
import { type AnsweredQuestionInput, computeScoresCore, type QuizOptionData } from './scoring-core'

/*
 * Динамика по сессиям клиента для кабинета психолога (пул 2026-09-24, волна 7.1).
 *
 * В `QuizSession.scores` лежат только сырые баллы, а их нельзя сравнивать ни между
 * сессиями (зависят от того, сколько релевантных вопросов шкалы попало в порцию), ни
 * между шкалами. Нормализация требует `actual_max` по отвеченным вопросам — поэтому
 * баллы каждой сессии пересчитываются по её собственным ответам тем же ядром, что и
 * на сабмите. Миграция не нужна: ответы хранятся посессионно (`QuizAnswer.sessionId`).
 *
 * Пересчёт идёт по ТЕКУЩЕМУ ключу банка — сессии становятся сопоставимы между собой;
 * смену версии банка график показывает отдельно (`questionBankVersion`).
 */

/** Ответ клиента с привязкой к сессии */
export interface SessionAnswerRow {
  sessionId: string
  questionId: string | null
  selectedOption: number
}

/** Вопрос банка с разобранными вариантами */
export interface QuestionScoringRow {
  id: string
  sortOrder: number
  options: QuizOptionData[]
}

/** Метаданные сессии, которые график показывает как есть */
export interface SessionMeta {
  id: string
  completedAt: Date | null
  createdAt: Date
  answeredCount: number
  questionBankVersion: number | null
}

/** Индекс «Тёмное ядро» сессии — только то, что нужно графику */
export interface SessionDarkCore {
  core: number | null
  coreCiLow: number | null
  coreCiHigh: number | null
  structure: DarkCoreStructure
}

export interface SessionDynamicsPoint extends SessionMeta {
  /** Нормализованные баллы сессии; null — ни один ответ не распознан */
  normalized: Record<ScaleCode, number> | null
  /** null — мало ответов по тетраде в этой порции (индекс не считается) */
  darkCore: SessionDarkCore | null
}

/**
 * Пересчитать баллы и индекс ядра по каждой сессии. Порядок сессий — как на входе.
 * Ответы на неизвестные вопросы (удалены из банка) пропускаются, как в `calculateScores`.
 */
export function buildSessionDynamics(
  sessions: readonly SessionMeta[],
  answers: readonly SessionAnswerRow[],
  questions: readonly QuestionScoringRow[],
): SessionDynamicsPoint[] {
  const byId = new Map(questions.map((q) => [q.id, q]))
  const bySession = new Map<string, AnsweredQuestionInput[]>()
  for (const a of answers) {
    const q = a.questionId ? byId.get(a.questionId) : undefined
    if (!q) {
      continue
    }
    const list = bySession.get(a.sessionId) ?? []
    list.push({ sortOrder: q.sortOrder, selectedOption: a.selectedOption, options: q.options })
    bySession.set(a.sessionId, list)
  }

  return sessions.map((s) => {
    const answered = bySession.get(s.id)
    if (!answered?.length) {
      return { ...s, normalized: null, darkCore: null }
    }
    const scores = computeScoresCore(answered)
    const index = computeDarkCore({
      normalized: scores.normalized,
      relevantCounts: scores.relevantCounts,
      confidence: scores.confidence,
    })
    return {
      ...s,
      normalized: scores.normalized,
      darkCore: index.structure === 'insufficient'
        ? null
        : { core: index.core, coreCiLow: index.coreCiLow, coreCiHigh: index.coreCiHigh, structure: index.structure },
    }
  })
}

/** Минимум полей сессии для графика ядра */
export interface DarkCoreSession {
  id: string
  completedAt: Date | null
  createdAt: Date
  darkCore: SessionDarkCore | null
}

/** Точка графика: уровень ядра и интервал [низ, верх] — recharts рисует Area по паре значений */
export interface DarkCoreChartPoint {
  name: string
  core: number
  ci: [number, number]
}

/**
 * Точки графика из истории сессий. Сессия без индекса (мало ответов по тетраде в порции)
 * пропускается, но нумерация «#N» сохраняет её место — психолог видит, что сессия была.
 */
export function toDarkCoreChartPoints(sessions: readonly DarkCoreSession[], locale: string): DarkCoreChartPoint[] {
  return sessions.flatMap((s, i) => {
    const dc = s.darkCore
    if (!dc || dc.core === null) {
      return []
    }
    const date = new Date(s.completedAt ?? s.createdAt)
    return [{
      name: `#${i + 1} (${date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })})`,
      core: dc.core,
      ci: [dc.coreCiLow ?? dc.core, dc.coreCiHigh ?? dc.core],
    }]
  })
}
