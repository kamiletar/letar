import { describe, expect, it } from 'vitest'
import { kopecksToRub, rubToKopecks } from './money.js'

describe('rubToKopecks', () => {
  it('переводит целые рубли в копейки', () => {
    expect(rubToKopecks(100)).toBe(10000)
  })

  it('округляет дробные копейки (защита от float-погрешности)', () => {
    expect(rubToKopecks(19.99)).toBe(1999)
    expect(rubToKopecks(0.1 + 0.2)).toBe(30)
  })

  it('ноль остаётся нулём', () => {
    expect(rubToKopecks(0)).toBe(0)
  })

  it('поддерживает отрицательные суммы (скидка/погашение аванса)', () => {
    expect(rubToKopecks(-50.5)).toBe(-5050)
  })
})

describe('kopecksToRub', () => {
  it('переводит копейки в рубли', () => {
    expect(kopecksToRub(10000)).toBe(100)
  })

  it('дробные копейки дают дробные рубли', () => {
    expect(kopecksToRub(1999)).toBeCloseTo(19.99)
  })

  it('ноль остаётся нулём', () => {
    expect(kopecksToRub(0)).toBe(0)
  })

  it('отрицательные копейки дают отрицательные рубли', () => {
    expect(kopecksToRub(-5050)).toBe(-50.5)
  })
})
