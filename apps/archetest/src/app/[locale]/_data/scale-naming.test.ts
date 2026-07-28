import { describe, expect, it } from 'vitest'
import {
  ALL_SCALE_CODES,
  DARK_TRIAD_DISPLAY,
  getPersonalityType,
  getScaleName,
  HEXAGRAM_SCALE_CODES,
  type PersonalityTypeCode,
  PUBLIC_CONSTRUCT_SCALES,
} from './personality-types'

/**
 * Политика 5.6.1 «клиническая лексика — только психологу» до этого держалась
 * на соглашении: четыре компонента выбирали `clinical` или `label` на месте вызова.
 * Тесты этого не ловили — они проверяли данные, а не компоненты. Здесь проверяется
 * сама точка именования, через которую теперь проходят все четыре вызова.
 */
describe('getScaleName', () => {
  it('audience: user — ни одна шкала ядра не отдаёт клиническое название', () => {
    for (const code of ALL_SCALE_CODES) {
      const type = getPersonalityType(code)
      for (const isRu of [true, false]) {
        const name = getScaleName(code, { audience: 'user' }, isRu)
        expect(name, `${code} ru=${isRu}`).not.toBe(isRu ? type.clinical : type.clinicalEn)
        expect(name).toContain(isRu ? type.label : type.labelEn)
      }
    }
  })

  it('audience: user + триада-алиас — алиас разрешён, он не диагноз, а термин триады', () => {
    expect(getScaleName('ANT', { audience: 'user', triadAlias: true }, true)).toBe('Психопатия')
    // без флага пользователь видит юзерскую лексику
    expect(getScaleName('ANT', { audience: 'user' }, true)).toBe('Дерзкий Бунтарь')
  })

  it('audience: construct — шкала вне белого списка молча падает на юзерское имя', () => {
    const outsider = ALL_SCALE_CODES.find((c) => !PUBLIC_CONSTRUCT_SCALES.includes(c)) as PersonalityTypeCode
    const type = getPersonalityType(outsider)
    const name = getScaleName(outsider, { audience: 'construct' }, true)

    expect(name).toBe(`${type.label} ${type.archetype}`)
    expect(name).not.toBe(type.clinical)
  })

  it('audience: construct — все восемь шкал гексаграммы в белом списке', () => {
    for (const code of HEXAGRAM_SCALE_CODES) {
      expect(PUBLIC_CONSTRUCT_SCALES, `${code} должна быть публично-конструктной`).toContain(code)
    }
  })

  it('audience: clinician — конструктное название доступно для любой шкалы ядра', () => {
    for (const code of ALL_SCALE_CODES) {
      const type = getPersonalityType(code)
      const alias = DARK_TRIAD_DISPLAY[code]
      const name = getScaleName(code, { audience: 'clinician' }, true)
      // без флага алиас не подставляется, даже если он есть
      expect(name, `${code}`).toBe(type.clinical)
      if (alias) {
        expect(getScaleName(code, { audience: 'clinician', triadAlias: true }, true)).toBe(alias.ru)
      }
    }
  })

  it('обе локали заполнены — пустая строка не проходит', () => {
    for (const code of ALL_SCALE_CODES) {
      for (const audience of ['user', 'construct', 'clinician'] as const) {
        expect(getScaleName(code, { audience }, true).trim(), `${code}/${audience}/ru`).not.toBe('')
        expect(getScaleName(code, { audience }, false).trim(), `${code}/${audience}/en`).not.toBe('')
      }
    }
  })
})
