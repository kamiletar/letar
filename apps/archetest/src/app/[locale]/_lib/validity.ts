/**
 * Вычисление валидности протокола сессии (этап 5.1).
 *
 * Сигналы:
 * 1. Проваленные attention-check вопросы (справочник _data/validity-checks.ts)
 * 2. Монотонный паттерн: почти все ответы — одна и та же опция
 *
 * Невалидный протокол сохраняется (raw неприкосновенен), но помечается
 * isValid = false: исключается из усреднения/динамики/норм и не даёт XP.
 */
import { getValidityCheck, MAX_FAILED_CHECKS, MONOTONE_MIN_ANSWERS, MONOTONE_SHARE } from '../_data/validity-checks'

export interface ValidityInput {
  sortOrder: number
  selectedOption: number
}

export interface ValidityFlags {
  /** Сколько чек-вопросов встретилось в сессии */
  checksSeen: number
  /** Сколько из них провалено */
  checksFailed: number
  /** Монотонный паттерн ответов (≈одна и та же опция всю сессию) */
  monotone: boolean
  /** Итоговый вердикт */
  isValid: boolean
}

/** Посчитать флаги валидности по ответам сессии */
export function computeValidityFlags(answers: ValidityInput[]): ValidityFlags {
  let checksSeen = 0
  let checksFailed = 0

  for (const a of answers) {
    const check = getValidityCheck(a.sortOrder)
    if (check) {
      checksSeen++
      if (a.selectedOption !== check.correctOptionIndex) {
        checksFailed++
      }
    }
  }

  // Монотонность считаем по содержательным ответам (без чек-вопросов)
  const substantive = answers.filter((a) => !getValidityCheck(a.sortOrder))
  let monotone = false
  if (substantive.length >= MONOTONE_MIN_ANSWERS) {
    const counts = new Map<number, number>()
    for (const a of substantive) {
      counts.set(a.selectedOption, (counts.get(a.selectedOption) ?? 0) + 1)
    }
    const maxShare = Math.max(...counts.values()) / substantive.length
    monotone = maxShare >= MONOTONE_SHARE
  }

  const isValid = checksFailed < MAX_FAILED_CHECKS && !monotone

  return { checksSeen, checksFailed, monotone, isValid }
}
