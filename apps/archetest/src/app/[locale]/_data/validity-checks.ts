/**
 * Attention-check вопросы (infrequency-пункты) — контроль валидности протокола.
 *
 * Это НЕ шкала личности: вопросы имеют пустой scoring и не влияют на баллы.
 * В каждую полную сессию инжектятся VALIDITY_PER_SESSION штук (quiz.action),
 * допускается повторный показ между сессиями.
 *
 * Провал ≥ 2 чек-вопросов или монотонный паттерн ответов → протокол помечается
 * невалидным (isValid = false): исключается из усреднения/динамики и не даёт XP.
 */

/** Сколько attention-check вопросов инжектится в каждую полную сессию */
export const VALIDITY_PER_SESSION = 2

/** Порог провалов, после которого протокол невалиден */
export const MAX_FAILED_CHECKS = 2

/** Доля одинаковых ответов подряд по всей сессии, при которой паттерн монотонный */
export const MONOTONE_SHARE = 0.9

/** Минимум ответов, чтобы монотонность вообще оценивалась */
export const MONOTONE_MIN_ANSWERS = 20

export interface ValidityCheck {
  /** sortOrder вопроса в банке (0-based) */
  sortOrder: number
  /** Индекс опции, которую обязан выбрать внимательный респондент */
  correctOptionIndex: number
}

/**
 * Справочник чек-вопросов. sortOrder фиксируется скриптом
 * prisma/add-validity-questions.ts; целостность проверяет question-bank.test.ts.
 */
export const VALIDITY_CHECKS: ValidityCheck[] = [
  { sortOrder: 2090, correctOptionIndex: 2 },
  { sortOrder: 2091, correctOptionIndex: 0 },
  { sortOrder: 2092, correctOptionIndex: 3 },
  { sortOrder: 2093, correctOptionIndex: 1 },
  { sortOrder: 2094, correctOptionIndex: 2 },
  { sortOrder: 2095, correctOptionIndex: 1 },
]

const CHECKS_BY_SORT_ORDER = new Map(VALIDITY_CHECKS.map((c) => [c.sortOrder, c]))

/** Является ли вопрос attention-check'ом */
export function isValidityQuestion(sortOrder: number): boolean {
  return CHECKS_BY_SORT_ORDER.has(sortOrder)
}

/** Получить чек по sortOrder */
export function getValidityCheck(sortOrder: number): ValidityCheck | undefined {
  return CHECKS_BY_SORT_ORDER.get(sortOrder)
}
