import { describe, expect, it } from 'vitest'
import { getGrowthPractices, GROWTH_PROFILES, PRACTICE_METHOD_LABELS, type PracticeMethod } from './growth-practices'
import { ALL_SCALE_CODES } from './personality-types'
import { getPositiveProfile, POSITIVE_PROFILES } from './positive-profiles'

const VALID_METHODS: PracticeMethod[] = ['cbt', 'dbt', 'schema', 'general']

describe('growth-practices (5.6.1)', () => {
  it('покрывает все 22 шкалы ядра 1:1, без дублей', () => {
    const codes = GROWTH_PROFILES.map((p) => p.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).toHaveLength(ALL_SCALE_CODES.length)
    for (const code of ALL_SCALE_CODES) {
      expect(codes).toContain(code)
    }
  })

  it('у каждой шкалы минимум 2 практики, заполненные на обоих языках', () => {
    for (const profile of GROWTH_PROFILES) {
      expect(profile.practices.length, `мало практик у ${profile.code}`).toBeGreaterThanOrEqual(2)
      for (const practice of profile.practices) {
        expect(practice.text, `пустой text у ${profile.code}`).toBeTruthy()
        expect(practice.textEn, `пустой textEn у ${profile.code}`).toBeTruthy()
        expect(VALID_METHODS, `неизвестный метод у ${profile.code}`).toContain(practice.method)
      }
    }
  })

  it('getGrowthPractices возвращает практики для каждого кода', () => {
    for (const code of ALL_SCALE_CODES) {
      expect(getGrowthPractices(code).length).toBeGreaterThanOrEqual(2)
    }
  })

  it('PRACTICE_METHOD_LABELS покрывает все методы на обоих языках', () => {
    for (const method of VALID_METHODS) {
      expect(PRACTICE_METHOD_LABELS[method].ru).toBeTruthy()
      expect(PRACTICE_METHOD_LABELS[method].en).toBeTruthy()
    }
  })
})

describe('positive-profiles расширены до 22 шкал (5.6.1)', () => {
  it('POSITIVE_PROFILES покрывает все 22 шкалы, без дублей', () => {
    const codes = POSITIVE_PROFILES.map((p) => p.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes).toHaveLength(ALL_SCALE_CODES.length)
    for (const code of ALL_SCALE_CODES) {
      expect(codes).toContain(code)
    }
  })

  it('у каждого профиля непустая суперсила ru+en', () => {
    for (const code of ALL_SCALE_CODES) {
      const profile = getPositiveProfile(code)
      expect(profile, `нет профиля для ${code}`).toBeTruthy()
      expect(profile!.text, `пустой text у ${code}`).toBeTruthy()
      expect(profile!.textEn, `пустой textEn у ${code}`).toBeTruthy()
    }
  })
})
