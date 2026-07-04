import { describe, expect, it } from 'vitest'
import {
  ALL_SCALE_CODES,
  BASE_SCALE_CODES,
  DARK_TRIAD_CODES,
  DARK_TRIAD_DISPLAY,
  EXTENDED_SCALE_CODES,
  getPersonalityType,
  GLOBAL_MAX_SCORES,
  HEXAGRAM_SCALE_CODES,
  LIGHT_TRIAD_CODES,
  PERSONALITY_TYPES,
  replaceTypeCodes,
} from './personality-types'

describe('шкалы ядра (22 = 13 + 9)', () => {
  it('ALL_SCALE_CODES содержит 22 уникальных кода', () => {
    expect(ALL_SCALE_CODES).toHaveLength(22)
    expect(new Set(ALL_SCALE_CODES).size).toBe(22)
  })

  it('BASE_SCALE_CODES не изменился (10 шкал DSM-5)', () => {
    expect(BASE_SCALE_CODES).toHaveLength(10)
  })

  it('EXTENDED_SCALE_CODES — 9 новых шкал этапа 5.1', () => {
    expect(EXTENDED_SCALE_CODES).toEqual(['MAC', 'HUM', 'KAN', 'FAI', 'SAD', 'MAS', 'ASD', 'DIR', 'ALX'])
    for (const code of EXTENDED_SCALE_CODES) {
      expect(ALL_SCALE_CODES).toContain(code)
    }
  })

  it('PERSONALITY_TYPES покрывает все коды 1:1, без дублей', () => {
    expect(PERSONALITY_TYPES).toHaveLength(ALL_SCALE_CODES.length)
    const codes = PERSONALITY_TYPES.map((t) => t.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of ALL_SCALE_CODES) {
      expect(codes).toContain(code)
    }
  })

  it('каждая запись заполнена на обоих языках', () => {
    for (const t of PERSONALITY_TYPES) {
      for (const field of [
        t.label,
        t.labelEn,
        t.clinical,
        t.clinicalEn,
        t.archetype,
        t.archetypeEn,
        t.description,
        t.descriptionEn,
        t.whenHigh,
        t.whenHighEn,
        t.color,
      ]) {
        expect(field, `пустое поле у ${t.code}`).toBeTruthy()
      }
      expect(t.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  it('getPersonalityType возвращает запись для каждого кода', () => {
    for (const code of ALL_SCALE_CODES) {
      expect(getPersonalityType(code).code).toBe(code)
    }
  })

  it('GLOBAL_MAX_SCORES содержит все 22 кода', () => {
    expect(Object.keys(GLOBAL_MAX_SCORES).sort()).toEqual([...ALL_SCALE_CODES].sort())
  })
})

describe('триады и гексаграмма', () => {
  it('Светлая триада: HUM, KAN, FAI — кластер light', () => {
    expect(LIGHT_TRIAD_CODES).toEqual(['HUM', 'KAN', 'FAI'])
    for (const code of LIGHT_TRIAD_CODES) {
      expect(getPersonalityType(code).cluster).toBe('light')
    }
  })

  it('Тёмная триада переиспользует NAR и ANT (PSY — alias, не шкала)', () => {
    expect(DARK_TRIAD_CODES).toEqual(['MAC', 'NAR', 'ANT'])
    // PSY не существует как отдельный код
    expect(ALL_SCALE_CODES).not.toContain('PSY')
    // display-alias: ANT в контексте триады отображается как «Психопатия»
    expect(DARK_TRIAD_DISPLAY.ANT?.ru).toBe('Психопатия')
    expect(DARK_TRIAD_DISPLAY.ANT?.en).toBe('Psychopathy')
    expect(DARK_TRIAD_DISPLAY.NAR?.ru).toBe('Нарциссизм')
  })

  it('гексаграмма = 8 шкал: обе триады + SAD/MAS', () => {
    expect(HEXAGRAM_SCALE_CODES).toHaveLength(8)
    expect(new Set(HEXAGRAM_SCALE_CODES).size).toBe(8)
    expect(HEXAGRAM_SCALE_CODES).toEqual(
      expect.arrayContaining([...LIGHT_TRIAD_CODES, ...DARK_TRIAD_CODES, 'SAD', 'MAS'])
    )
    // DIR сознательно НЕ входит в гексаграмму/экспресс (решение 2026-07-03)
    expect(HEXAGRAM_SCALE_CODES).not.toContain('DIR')
  })

  it('MAS помечен как бета (авторский конструкт), остальные новые — нет', () => {
    expect(getPersonalityType('MAS').beta).toBe(true)
    for (const code of EXTENDED_SCALE_CODES.filter((c) => c !== 'MAS')) {
      expect(getPersonalityType(code).beta, `${code} не должен быть бетой`).toBeFalsy()
    }
  })
})

describe('replaceTypeCodes', () => {
  it('заменяет и старые, и новые коды', () => {
    expect(replaceTypeCodes('PAR', true)).toBe('Бдительный Страж')
    expect(replaceTypeCodes('MAC', true)).toBe('Стратегичный Гроссмейстер')
    expect(replaceTypeCodes('DIR', false)).toBe('Direct Mirror')
  })

  it('не трогает неизвестные слова', () => {
    expect(replaceTypeCodes('ABC XYZ', true)).toBe('ABC XYZ')
  })
})
