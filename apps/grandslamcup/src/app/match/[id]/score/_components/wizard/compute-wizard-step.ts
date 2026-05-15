/**
 * Чистая функция определения текущего шага wizard'а скорера.
 *
 * Шаг определяется **исключительно** по реальному состоянию матча и matchState,
 * без локальной машины состояний. Это гарантирует синхронизацию между всеми устройствами
 * и автоматическое восстановление после перезагрузки страницы.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'

export type WizardStep =
  | 'START_MATCH' // Матч SCHEDULED — ждёт старта
  | 'SELECT_JURY' // LIVE, жюри не заполнено (< 5 судей)
  | 'COIN_FLIP' // Жюри готово, но жеребьёвка не проведена
  | 'PERFORMER_PICK' // Ожидание выбора поэта (IDLE)
  | 'PERFORMING' // Поэт на сцене, таймер идёт
  | 'TEXT_VOTING' // Голосование за текст
  | 'DELIVERY_VOTING' // Голосование за подачу
  | 'POET_RESULT' // Результат одного поэта (после DELIVERY_COMPLETE) — оценки, итог, «Следующий поэт»
  | 'PAIR_RESULTS' // Пара завершена (оба поэта оценены)
  | 'HALF_SUMMARY' // Все 5 пар тайма сыграны — итоги тайма (промежуточный экран)
  | 'INTERMISSION' // Перерыв между 1-м и 2-м таймом
  | 'FINAL_RESULTS' // Итоги матча перед выбором победного стихотворения
  | 'VICTORY_POEM' // Матч окончен, ждём выбора победного стихотворения
  | 'MATCH_FINISHED' // Финальный экран

/** Минимум полей матча, достаточный для вычисления шага */
export interface WizardMatchInput {
  status: string
  firstHalfStartTeam: string | null
  victoryPoemPlayerId: string | null
  /** Флаг: скорер подтвердил экран финальных результатов, переходим к выбору поэта */
  finalResultsConfirmed?: boolean
  performances: Array<{ half: number; totalScore: number | null }>
}

/** Считаем пары только по явному параметру half */
export function countPairs(performances: Array<{ half: number; totalScore: number | null }>, half: number): number {
  return Math.floor(performances.filter((p) => p.half === half && p.totalScore !== null).length / 2)
}

/** Пар в тайме (5 пар = 10 завершённых выступлений) */
export function countCompletedPairsInHalf(
  performances: Array<{ half: number; totalScore: number | null }>,
  half: number
): number {
  const completed = performances.filter((p) => p.half === half && p.totalScore !== null).length
  return Math.floor(completed / 2)
}

export function computeWizardStep(match: WizardMatchInput, matchState: MatchSSEState | null): WizardStep {
  // Финальный статус — всегда финал
  if (match.status === 'FINISHED') {
    return 'MATCH_FINISHED'
  }

  // Ещё не стартовали
  if (match.status === 'SCHEDULED') {
    return 'START_MATCH'
  }

  // LIVE — смотрим на matchState
  // Если matchState ещё не загружен (SSE connecting) — показываем безопасный default
  if (!matchState) {
    return 'START_MATCH'
  }

  // Явные фазы проверяем первыми — они не зависят от судей и жеребьёвки
  switch (matchState.phase) {
    case 'PERFORMING':
      return 'PERFORMING'
    case 'INTERMISSION':
      return 'INTERMISSION'
    case 'HALF_SUMMARY':
      return 'HALF_SUMMARY'
    case 'POET_RESULT':
      return 'POET_RESULT'
  }

  // 1. Жюри не заполнено
  if (matchState.judges.length < 5) {
    return 'SELECT_JURY'
  }

  // 2. Жеребьёвка не проведена
  if (!match.firstHalfStartTeam) {
    return 'COIN_FLIP'
  }

  const half = matchState.currentHalf
  const pairs2 = countPairs(match.performances, 2)

  // 3. Конец 2-го тайма — итоги матча → победное стихотворение
  if (half === 2 && pairs2 >= 5) {
    if (matchState.phase === 'ROUND_COMPLETE') {
      return 'PAIR_RESULTS'
    }
    // phase === IDLE (после showHalfSummaryAction + nextRoundAction из StepHalfSummary)
    if (!match.finalResultsConfirmed) {
      return 'FINAL_RESULTS'
    }
    if (!match.victoryPoemPlayerId) {
      return 'VICTORY_POEM'
    }
    return 'MATCH_FINISHED'
  }

  // 4. Внутри раунда — смотрим на фазу голосования
  switch (matchState.phase) {
    case 'IDLE':
      return 'PERFORMER_PICK'
    case 'TEXT_VOTING':
    case 'TEXT_COMPLETE':
      return 'TEXT_VOTING'
    case 'DELIVERY_VOTING':
    case 'DELIVERY_COMPLETE':
      // DELIVERY_COMPLETE показывает голосование с активной кнопкой «Показать результат»
      return 'DELIVERY_VOTING'
    case 'ROUND_COMPLETE':
      return 'PAIR_RESULTS'
    default:
      return 'PERFORMER_PICK'
  }
}
