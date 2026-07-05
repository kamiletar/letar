import { describe, expect, it } from 'vitest'
import { SAFETY_NET_THRESHOLD } from '../_data/crisis-resources'
import type { PersonalityTypeCode } from '../_data/personality-types'
import { hasSafetyMarker, needsDarkReassurance, needsSafetyNet, SUICIDE_RISK_MARKERS } from './safety-net'

/** Нулевой профиль — все шкалы 0 */
function zeros(): Partial<Record<PersonalityTypeCode, number>> {
  return {}
}

describe('needsSafetyNet', () => {
  it('низкие баллы состояния → блок не нужен', () => {
    expect(needsSafetyNet({ DPR: 30, BAR: 40, BOR: 55 })).toBe(false)
  })

  it('DPR ≥ порога → блок нужен', () => {
    expect(needsSafetyNet({ DPR: SAFETY_NET_THRESHOLD })).toBe(true)
  })

  it('BAR ≥ порога → блок нужен', () => {
    expect(needsSafetyNet({ BAR: 75 })).toBe(true)
  })

  it('BOR ≥ порога → блок нужен', () => {
    expect(needsSafetyNet({ BOR: 90 })).toBe(true)
  })

  it('ровно на пороге — граница включительна', () => {
    expect(needsSafetyNet({ DPR: SAFETY_NET_THRESHOLD - 0.1 })).toBe(false)
    expect(needsSafetyNet({ DPR: SAFETY_NET_THRESHOLD })).toBe(true)
  })

  it('только тёмные шкалы высоки → кризисный блок не триггерится (это не про безопасность)', () => {
    expect(needsSafetyNet({ SAD: 95, MAC: 90, NAR: 88 })).toBe(false)
  })

  it('явный маркер риска → блок нужен даже при низких баллах', () => {
    expect(needsSafetyNet(zeros(), { marker: true })).toBe(true)
  })
})

describe('needsDarkReassurance', () => {
  it('низкие тёмные → формулировка не нужна', () => {
    expect(needsDarkReassurance({ MAC: 40, NAR: 50, SAD: 30 })).toBe(false)
  })

  it('высокая тёмная шкала → формулировка нужна', () => {
    expect(needsDarkReassurance({ SAD: 70 })).toBe(true)
  })

  it('ANT (Психопатия) как тёмная — учитывается', () => {
    expect(needsDarkReassurance({ ANT: 80 })).toBe(true)
  })
})

describe('hasSafetyMarker', () => {
  it('реестр маркеров пуст до разметки психологом (зависимость 5.6.2)', () => {
    expect(SUICIDE_RISK_MARKERS).toHaveLength(0)
  })

  it('пустой реестр → маркер никогда не срабатывает', () => {
    expect(hasSafetyMarker([{ sortOrder: 100, selectedOption: 3 }])).toBe(false)
    expect(hasSafetyMarker([])).toBe(false)
  })
})
