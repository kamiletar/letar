import { describe, expect, it } from 'vitest'

import { formatTime } from './format-time'

// formatTime — реэкспорт из @letar/video-player-core.
// Тест на реэкспорт: проверяем, что функция доступна и работает по контракту
// форматирования времени плеера (граничные случаи), а не переопределяем логику core.
describe('formatTime (реэкспорт из @letar/video-player-core)', () => {
  it('экспортирует функцию', () => {
    expect(typeof formatTime).toBe('function')
  })

  it('форматирует 0 секунд', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('форматирует секунды без часов (MM:SS)', () => {
    expect(formatTime(65)).toBe('1:05')
  })

  it('форматирует секунды с часами (H:MM:SS)', () => {
    expect(formatTime(3661)).toBe('1:01:01')
  })

  it('округляет дробные секунды вниз', () => {
    expect(formatTime(59.9)).toBe('0:59')
  })

  it('обрабатывает NaN/Infinity как 0:00', () => {
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(Infinity)).toBe('0:00')
  })
})
