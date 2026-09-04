import { describe, expect, it } from 'vitest'
import { correctKeyboardLayout, detectLayout } from './keyboard-layout'

describe('detectLayout', () => {
  it('определяет русский текст', () => {
    expect(detectLayout('машина')).toBe('ru')
  })

  it('определяет латинский текст', () => {
    expect(detectLayout('mashina')).toBe('en')
  })

  it('не определяет раскладку для чисел и пунктуации', () => {
    expect(detectLayout('12345')).toBe('unknown')
    expect(detectLayout('')).toBe('unknown')
  })

  it('не определяет раскладку при явной смеси алфавитов', () => {
    expect(detectLayout('abc123абв')).toBe('unknown')
  })
})

describe('correctKeyboardLayout', () => {
  it('исправляет русское слово, набранное в EN-раскладке', () => {
    // "машина" на клавиатуре в английской раскладке даёт "vfibyf"
    expect(correctKeyboardLayout('vfibyf')).toBe('машина')
  })

  it('исправляет английское слово, набранное в RU-раскладке', () => {
    // "house" на клавиатуре в русской раскладке даёт "рщгыу"
    expect(correctKeyboardLayout('рщгыу')).toBe('house')
  })

  it('возвращает текст без изменений, если раскладку определить нельзя', () => {
    expect(correctKeyboardLayout('12345')).toBe('12345')
  })
})
