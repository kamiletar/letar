import { describe, expect, it } from 'vitest'
import { formatTime } from './format-time'

describe('formatTime', () => {
  it('форматирует секунды меньше минуты', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(59)).toBe('0:59')
  })

  it('форматирует минуты и секунды (mm:ss)', () => {
    expect(formatTime(60)).toBe('1:00')
    expect(formatTime(83)).toBe('1:23')
    expect(formatTime(599)).toBe('9:59')
    expect(formatTime(3599)).toBe('59:59')
  })

  it('форматирует часы, минуты и секунды (hh:mm:ss)', () => {
    expect(formatTime(3600)).toBe('1:00:00')
    expect(formatTime(3723)).toBe('1:02:03')
    expect(formatTime(36000)).toBe('10:00:00')
  })

  it('отбрасывает дробную часть секунд', () => {
    expect(formatTime(83.9)).toBe('1:23')
    expect(formatTime(3723.5)).toBe('1:02:03')
  })

  it('возвращает "0:00" для невалидных значений', () => {
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(Infinity)).toBe('0:00')
    expect(formatTime(-Infinity)).toBe('0:00')
  })

  it('обрабатывает отрицательные значения через Math.floor (округление к минус бесконечности)', () => {
    // Math.floor(-5 / 3600) = -1, Math.floor((-5 % 3600) / 60) = -1, Math.floor(-5 % 60) = -5
    // Это задокументированное поведение текущей реализации, не "корректный" таймкод.
    expect(formatTime(-5)).toBe('-1:-5')
  })
})
