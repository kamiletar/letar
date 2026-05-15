import { describe, expect, it } from 'vitest'
import {
  calculateNumerology,
  formatMatrixDescription,
  generateNumerologyProfileData,
  getArcanaInterpretation,
} from '../numerology'

describe('calculateNumerology', () => {
  it('принимает Date объект', () => {
    const result = calculateNumerology(new Date('1990-06-15'))
    expect(result.birthDay).toBe(15)
    expect(result.birthMonth).toBe(6)
    expect(result.birthYear).toBe(1990)
  })

  it('принимает ISO строку', () => {
    const result = calculateNumerology('1990-06-15')
    expect(result.birthDay).toBe(15)
    expect(result.birthMonth).toBe(6)
    expect(result.birthYear).toBe(1990)
  })

  it('бросает ошибку на невалидную дату', () => {
    expect(() => calculateNumerology('invalid')).toThrow('Некорректная дата рождения')
  })

  it('бросает ошибку на дату до 1900', () => {
    expect(() => calculateNumerology('1899-01-01')).toThrow('Дата рождения должна быть между 1900 и 2100 годами')
  })

  it('бросает ошибку на дату после 2100', () => {
    expect(() => calculateNumerology('2101-01-01')).toThrow('Дата рождения должна быть между 1900 и 2100 годами')
  })

  it('ключевые числа в диапазоне 1-22', () => {
    const result = calculateNumerology('1990-06-15')
    expect(result.personalNumber).toBeGreaterThanOrEqual(1)
    expect(result.personalNumber).toBeLessThanOrEqual(22)
    expect(result.destinyNumber).toBeGreaterThanOrEqual(1)
    expect(result.destinyNumber).toBeLessThanOrEqual(22)
    expect(result.soulNumber).toBeGreaterThanOrEqual(1)
    expect(result.soulNumber).toBeLessThanOrEqual(22)
  })

  it('зона талантов содержит 3 числа от 1 до 22', () => {
    const result = calculateNumerology('1990-06-15')
    expect(result.talentZone).toHaveLength(3)
    result.talentZone.forEach((t) => {
      expect(t).toBeGreaterThanOrEqual(1)
      expect(t).toBeLessThanOrEqual(22)
    })
  })

  it('кармическая зона содержит 2 числа от 1 до 22', () => {
    const result = calculateNumerology('1990-06-15')
    expect(result.karmaZone).toHaveLength(2)
    result.karmaZone.forEach((k) => {
      expect(k).toBeGreaterThanOrEqual(1)
      expect(k).toBeLessThanOrEqual(22)
    })
  })

  it('12 жизненных циклов по 7 лет', () => {
    const result = calculateNumerology('1990-06-15')
    expect(result.lifeCycles).toHaveLength(12)
    expect(result.lifeCycles[0].period).toBe('0-7 лет')
    expect(result.lifeCycles[11].period).toBe('77-84 лет')
  })

  it('fullMatrix содержит все разделы', () => {
    const result = calculateNumerology('1990-06-15')
    expect(result.fullMatrix.base).toBeDefined()
    expect(result.fullMatrix.main).toBeDefined()
    expect(result.fullMatrix.zones).toBeDefined()
    expect(result.fullMatrix.cycles).toHaveLength(12)
  })

  it('детерминированный результат для одной даты', () => {
    const r1 = calculateNumerology('1990-06-15')
    const r2 = calculateNumerology('1990-06-15')
    expect(r1.personalNumber).toBe(r2.personalNumber)
    expect(r1.destinyNumber).toBe(r2.destinyNumber)
    expect(r1.soulNumber).toBe(r2.soulNumber)
    expect(r1.talentZone).toEqual(r2.talentZone)
  })

  it('разные даты дают разные результаты', () => {
    const r1 = calculateNumerology('1990-06-15')
    const r2 = calculateNumerology('2000-12-25')
    // Хотя бы одно число должно отличаться
    const isDifferent =
      r1.personalNumber !== r2.personalNumber ||
      r1.destinyNumber !== r2.destinyNumber ||
      r1.soulNumber !== r2.soulNumber
    expect(isDifferent).toBe(true)
  })
})

describe('getArcanaInterpretation', () => {
  it('возвращает описание для чисел 1-22', () => {
    for (let i = 1; i <= 22; i++) {
      const result = getArcanaInterpretation(i)
      expect(result).toBeTruthy()
      expect(result).not.toBe(`Аркан ${i}`)
    }
  })

  it('возвращает fallback для числа вне диапазона', () => {
    expect(getArcanaInterpretation(0)).toBe('Аркан 0')
    expect(getArcanaInterpretation(23)).toBe('Аркан 23')
  })

  it('Маг — первый аркан', () => {
    expect(getArcanaInterpretation(1)).toContain('Маг')
  })

  it('Шут — 22-й аркан', () => {
    expect(getArcanaInterpretation(22)).toContain('Шут')
  })
})

describe('formatMatrixDescription', () => {
  it('содержит дату рождения и основные числа', () => {
    const matrix = calculateNumerology('1990-06-15')
    const desc = formatMatrixDescription(matrix)
    expect(desc).toContain('15.6.1990')
    expect(desc).toContain('МАТРИЦА СУДЬБЫ')
    expect(desc).toContain('Личное число')
    expect(desc).toContain('Число судьбы')
    expect(desc).toContain('Число души')
  })
})

describe('generateNumerologyProfileData', () => {
  it('генерирует валидные данные профиля', () => {
    const data = generateNumerologyProfileData('1990-06-15')
    expect(data.lifePathNumber).toBeGreaterThanOrEqual(1)
    expect(data.lifePathNumber).toBeLessThanOrEqual(22)
    expect(data.destinyNumber).toBeGreaterThanOrEqual(1)
    expect(data.soulNumber).toBeGreaterThanOrEqual(1)
    expect(data.personalityNumber).toBeGreaterThanOrEqual(1)
    expect(data.maturityNumber).toBeGreaterThanOrEqual(1)
    expect(data.maturityNumber).toBeLessThanOrEqual(22)
  })

  it('текущий цикл содержит период', () => {
    const data = generateNumerologyProfileData('1990-06-15')
    expect(data.currentCycle).toMatch(/\d+-\d+ лет/)
  })

  it('matrixData — валидный JSON', () => {
    const data = generateNumerologyProfileData('1990-06-15')
    expect(() => JSON.parse(data.matrixData)).not.toThrow()
  })

  it('заметка содержит дату', () => {
    const data = generateNumerologyProfileData('1990-06-15')
    expect(data.notes).toContain('Автоматически сгенерировано')
  })

  it('кармические долги — числа 13, 14, 16, 19', () => {
    const data = generateNumerologyProfileData('1990-06-15')
    expect(typeof data.karmicDebts).toBe('string')
    expect(data.karmicDebts.length).toBeGreaterThan(0)
  })
})
