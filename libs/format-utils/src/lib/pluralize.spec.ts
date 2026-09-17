// globals: true в vitest.config.ts — describe, expect, it доступны глобально
import { pluralizeRu } from './pluralize'

describe('pluralizeRu', () => {
  it('единственное число — окончание 1, кроме 11', () => {
    expect(pluralizeRu(1, 'спальня', 'спальни', 'спален')).toBe('спальня')
    expect(pluralizeRu(21, 'спальня', 'спальни', 'спален')).toBe('спальня')
    expect(pluralizeRu(101, 'спальня', 'спальни', 'спален')).toBe('спальня')
  })

  it('форма few — окончания 2-4, кроме 12-14', () => {
    expect(pluralizeRu(2, 'спальня', 'спальни', 'спален')).toBe('спальни')
    expect(pluralizeRu(3, 'спальня', 'спальни', 'спален')).toBe('спальни')
    expect(pluralizeRu(4, 'спальня', 'спальни', 'спален')).toBe('спальни')
    expect(pluralizeRu(24, 'спальня', 'спальни', 'спален')).toBe('спальни')
  })

  it('форма many — 0, 5-20, окончания 5-9', () => {
    expect(pluralizeRu(0, 'спальня', 'спальни', 'спален')).toBe('спален')
    expect(pluralizeRu(5, 'спальня', 'спальни', 'спален')).toBe('спален')
    expect(pluralizeRu(11, 'спальня', 'спальни', 'спален')).toBe('спален')
    expect(pluralizeRu(19, 'спальня', 'спальни', 'спален')).toBe('спален')
    expect(pluralizeRu(25, 'спальня', 'спальни', 'спален')).toBe('спален')
  })

  it('11-14 всегда many независимо от сотен', () => {
    expect(pluralizeRu(111, 'спальня', 'спальни', 'спален')).toBe('спален')
    expect(pluralizeRu(112, 'спальня', 'спальни', 'спален')).toBe('спален')
    expect(pluralizeRu(114, 'спальня', 'спальни', 'спален')).toBe('спален')
  })

  it('дробное число всегда форма few (родительный падеж единственного числа)', () => {
    expect(pluralizeRu(2.5, 'метр', 'метра', 'метров')).toBe('метра')
    expect(pluralizeRu(0.5, 'метр', 'метра', 'метров')).toBe('метра')
    expect(pluralizeRu(1.5, 'метр', 'метра', 'метров')).toBe('метра')
    expect(pluralizeRu(11.5, 'метр', 'метра', 'метров')).toBe('метра')
    expect(pluralizeRu(21.5, 'метр', 'метра', 'метров')).toBe('метра')
  })

  it('отрицательные числа склоняются по модулю', () => {
    expect(pluralizeRu(-1, 'спальня', 'спальни', 'спален')).toBe('спальня')
    expect(pluralizeRu(-2, 'спальня', 'спальни', 'спален')).toBe('спальни')
    expect(pluralizeRu(-11, 'спальня', 'спальни', 'спален')).toBe('спален')
  })
})
