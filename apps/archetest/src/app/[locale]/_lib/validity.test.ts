import { describe, expect, it } from 'vitest'
import { VALIDITY_CHECKS } from '../_data/validity-checks'
import { computeValidityFlags, type ValidityInput } from './validity'

const CHECK_A = VALIDITY_CHECKS[0]
const CHECK_B = VALIDITY_CHECKS[1]

/** N содержательных ответов с заданными опциями (циклично) */
function substantive(n: number, options: number[] = [0, 1, 2, 3]): ValidityInput[] {
  return Array.from({ length: n }, (_, i) => ({ sortOrder: i, selectedOption: options[i % options.length] }))
}

describe('computeValidityFlags', () => {
  it('нормальная сессия: чеки пройдены, паттерн разнообразный → валидна', () => {
    const answers = [
      ...substantive(48),
      { sortOrder: CHECK_A.sortOrder, selectedOption: CHECK_A.correctOptionIndex },
      { sortOrder: CHECK_B.sortOrder, selectedOption: CHECK_B.correctOptionIndex },
    ]
    const flags = computeValidityFlags(answers)
    expect(flags).toEqual({ checksSeen: 2, checksFailed: 0, monotone: false, isValid: true })
  })

  it('один проваленный чек — ещё валидна (порог 2)', () => {
    const answers = [
      ...substantive(48),
      { sortOrder: CHECK_A.sortOrder, selectedOption: CHECK_A.correctOptionIndex + 1 },
      { sortOrder: CHECK_B.sortOrder, selectedOption: CHECK_B.correctOptionIndex },
    ]
    const flags = computeValidityFlags(answers)
    expect(flags.checksFailed).toBe(1)
    expect(flags.isValid).toBe(true)
  })

  it('два проваленных чека → невалидна', () => {
    const answers = [
      ...substantive(48),
      { sortOrder: CHECK_A.sortOrder, selectedOption: CHECK_A.correctOptionIndex + 1 },
      { sortOrder: CHECK_B.sortOrder, selectedOption: (CHECK_B.correctOptionIndex + 1) % 4 },
    ]
    const flags = computeValidityFlags(answers)
    expect(flags.checksFailed).toBe(2)
    expect(flags.isValid).toBe(false)
  })

  it('монотонный паттерн (все ответы — опция 2) → невалидна', () => {
    const answers = substantive(50, [2])
    const flags = computeValidityFlags(answers)
    expect(flags.monotone).toBe(true)
    expect(flags.isValid).toBe(false)
  })

  it('монотонность не оценивается на коротких сессиях (< 20 ответов)', () => {
    const answers = substantive(10, [2])
    const flags = computeValidityFlags(answers)
    expect(flags.monotone).toBe(false)
    expect(flags.isValid).toBe(true)
  })

  it('чек-вопросы не учитываются в оценке монотонности', () => {
    // 19 содержательных + 2 чека = 21 ответ, но содержательных < 20 → монотонность не оценивается
    const answers = [
      ...substantive(19, [1]),
      { sortOrder: CHECK_A.sortOrder, selectedOption: CHECK_A.correctOptionIndex },
      { sortOrder: CHECK_B.sortOrder, selectedOption: CHECK_B.correctOptionIndex },
    ]
    const flags = computeValidityFlags(answers)
    expect(flags.monotone).toBe(false)
    expect(flags.isValid).toBe(true)
  })

  it('90% одной опции достаточно для монотонности', () => {
    // 45 из 50 — опция 0, 5 — другие (доля 0.9)
    const answers = [
      ...substantive(45, [0]),
      ...substantive(5, [1, 2, 3, 1, 2]).map((a, i) => ({ ...a, sortOrder: 100 + i })),
    ]
    const flags = computeValidityFlags(answers)
    expect(flags.monotone).toBe(true)
  })

  it('сессия без чек-вопросов валидна при разнообразном паттерне', () => {
    const flags = computeValidityFlags(substantive(50))
    expect(flags).toEqual({ checksSeen: 0, checksFailed: 0, monotone: false, isValid: true })
  })
})
