import { describe, expect, it } from 'vitest'
import { ALL_SCALE_CODES, type PersonalityTypeCode } from '../_data/personality-types'
import { applyInterpretationRules, HIGH_THRESHOLD } from './interpretation-rules'

/** Профиль с нулями по всем шкалам + переопределения */
function profile(overrides: Partial<Record<PersonalityTypeCode, number>>): Record<PersonalityTypeCode, number> {
  const base = Object.fromEntries(ALL_SCALE_CODES.map((c) => [c, 0])) as Record<PersonalityTypeCode, number>
  return { ...base, ...overrides }
}

describe('applyInterpretationRules', () => {
  it('без срабатываний возвращает баллы как есть', () => {
    const input = profile({ PAR: 50, HUM: 30 })
    const result = applyInterpretationRules(input)
    expect(result.adjustedDisplay).toEqual(input)
    expect(result.appliedRules).toEqual([])
    expect(result.profileLabels).toEqual([])
  })

  it('НЕ мутирует входной объект (raw неприкосновенен)', () => {
    const input = profile({ ASD: 80, DIR: 80, ANT: 70, SAD: 50 })
    const copy = { ...input }
    applyInterpretationRules(input)
    expect(input).toEqual(copy)
  })

  describe('правило ASD×DIR («мотив — передача фактов»)', () => {
    it('высокие ASD и DIR снижают отображение ANT/SAD на 80%', () => {
      const result = applyInterpretationRules(profile({ ASD: 80, DIR: 70, ANT: 50, SAD: 40 }))
      expect(result.adjustedDisplay.ANT).toBe(10)
      expect(result.adjustedDisplay.SAD).toBe(8)
      expect(result.appliedRules.map((r) => r.id)).toContain('asd-dir-truth-motive')
      expect(result.profileLabels.map((l) => l.id)).toContain('radically-honest')
    })

    it('высокий ASD БЕЗ высокого DIR правило не запускает (решение 2026-07-03)', () => {
      const result = applyInterpretationRules(profile({ ASD: 80, DIR: 30, ANT: 50, SAD: 40 }))
      expect(result.adjustedDisplay.ANT).toBe(50)
      expect(result.adjustedDisplay.SAD).toBe(40)
      expect(result.appliedRules).toEqual([])
    })

    it('высокий DIR без ASD правило не запускает', () => {
      const result = applyInterpretationRules(profile({ ASD: 20, DIR: 90, ANT: 50 }))
      expect(result.adjustedDisplay.ANT).toBe(50)
    })
  })

  describe('профиль «Маскирующий»', () => {
    it('высокий ASD + низкий DIR → метка masking', () => {
      const result = applyInterpretationRules(profile({ ASD: 70, DIR: 20 }))
      expect(result.profileLabels.map((l) => l.id)).toContain('masking')
    })

    it('высокий ASD + высокий DIR → НЕ masking, а radically-honest', () => {
      const result = applyInterpretationRules(profile({ ASD: 70, DIR: 70 }))
      const ids = result.profileLabels.map((l) => l.id)
      expect(ids).toContain('radically-honest')
      expect(ids).not.toContain('masking')
    })
  })

  describe('профиль «Стратег»', () => {
    it('высокие MAC и SZD → метка strategist', () => {
      const result = applyInterpretationRules(profile({ MAC: 65, SZD: 60 }))
      expect(result.profileLabels.map((l) => l.id)).toContain('strategist')
    })

    it('MAC без SZD → без метки', () => {
      const result = applyInterpretationRules(profile({ MAC: 90, SZD: 30 }))
      expect(result.profileLabels).toEqual([])
    })
  })

  describe('NAR-фасеты (грандиозный/уязвимый)', () => {
    it('NAR + BOR → уязвимая грандиозность', () => {
      const result = applyInterpretationRules(profile({ NAR: 70, BOR: 65 }))
      expect(result.profileLabels.map((l) => l.id)).toContain('nar-vulnerable')
    })

    it('NAR + DPR → уязвимая грандиозность', () => {
      const result = applyInterpretationRules(profile({ NAR: 70, DPR: 60 }))
      expect(result.profileLabels.map((l) => l.id)).toContain('nar-vulnerable')
    })

    it('NAR без тревожно-депрессивного фона → грандиозный профиль', () => {
      const result = applyInterpretationRules(profile({ NAR: 70, AVD: 10, DEP: 15, DPR: 5 }))
      expect(result.profileLabels.map((l) => l.id)).toContain('nar-grandiose')
    })

    it('NAR со средним фоном (не высоким и не низким) → ни одной NAR-метки', () => {
      const result = applyInterpretationRules(profile({ NAR: 70, AVD: 50, DEP: 45, DPR: 45 }))
      const ids = result.profileLabels.map((l) => l.id)
      expect(ids).not.toContain('nar-vulnerable')
      expect(ids).not.toContain('nar-grandiose')
    })
  })

  it('порог «высокого» согласован с уровнем significant (60)', () => {
    expect(HIGH_THRESHOLD).toBe(60)
    // ровно на пороге — правило срабатывает
    const result = applyInterpretationRules(profile({ ASD: 60, DIR: 60, ANT: 10 }))
    expect(result.appliedRules).toHaveLength(1)
  })
})
