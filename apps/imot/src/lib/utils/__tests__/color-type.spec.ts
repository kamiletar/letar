import { describe, expect, it } from 'vitest'
import type { ColorAnalysisInput } from '../color-type'
import { calculateColorType, getColorTypeQuestionnaire, getMakeupRecommendations } from '../color-type'

// Типичные входные данные для каждого цветотипа
const springInput: ColorAnalysisInput = {
  skinTone: 'light',
  skinUndertone: 'warm',
  hairColor: 'blonde',
  eyeColor: 'green',
  contrast: 'low',
  sunReaction: 'tans-easily',
}

const summerInput: ColorAnalysisInput = {
  skinTone: 'light',
  skinUndertone: 'cool',
  hairColor: 'platinum-blonde',
  eyeColor: 'blue',
  contrast: 'low',
  sunReaction: 'burns-easily',
}

const autumnInput: ColorAnalysisInput = {
  skinTone: 'olive',
  skinUndertone: 'warm',
  hairColor: 'auburn',
  eyeColor: 'hazel',
  contrast: 'medium',
  sunReaction: 'tans-easily',
}

const winterInput: ColorAnalysisInput = {
  skinTone: 'very-dark',
  skinUndertone: 'cool',
  hairColor: 'black',
  eyeColor: 'dark-brown',
  contrast: 'high',
  sunReaction: 'burns-easily',
}

describe('calculateColorType', () => {
  it('определяет Весну (тёплый + светлый)', () => {
    const result = calculateColorType(springInput)
    expect(result.colorType).toBe('SPRING')
  })

  it('определяет Лето (холодный + светлый)', () => {
    const result = calculateColorType(summerInput)
    expect(result.colorType).toBe('SUMMER')
  })

  it('определяет Осень (тёплый + тёмный)', () => {
    const result = calculateColorType(autumnInput)
    expect(result.colorType).toBe('AUTUMN')
  })

  it('определяет Зиму (холодный + тёмный)', () => {
    const result = calculateColorType(winterInput)
    expect(result.colorType).toBe('WINTER')
  })

  it('уверенность в диапазоне 0-100', () => {
    const result = calculateColorType(springInput)
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(100)
  })

  it('уверенность выше базовой при полных данных', () => {
    const result = calculateColorType(springInput) // sunReaction задан
    expect(result.confidence).toBeGreaterThan(70)
  })

  it('содержит описание и рекомендации', () => {
    const result = calculateColorType(springInput)
    expect(result.description).toBeTruthy()
    expect(result.recommendedColors.length).toBeGreaterThan(0)
    expect(result.avoidColors.length).toBeGreaterThan(0)
    expect(result.characteristics.length).toBeGreaterThan(0)
    expect(result.celebrityExamples.length).toBeGreaterThan(0)
  })
})

describe('getMakeupRecommendations', () => {
  it('возвращает рекомендации для каждого цветотипа', () => {
    for (const colorType of ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'] as const) {
      const result = getMakeupRecommendations(colorType)
      expect(result.foundation).toBeTruthy()
      expect(result.lips).toBeTruthy()
      expect(result.eyes).toBeTruthy()
      expect(result.cheeks).toBeTruthy()
    }
  })
})

describe('getColorTypeQuestionnaire', () => {
  it('возвращает массив вопросов с вариантами', () => {
    const questions = getColorTypeQuestionnaire()
    expect(questions.length).toBeGreaterThan(0)
    questions.forEach((q) => {
      expect(q.question).toBeTruthy()
      expect(q.options.length).toBeGreaterThan(0)
      q.options.forEach((o) => {
        expect(o.label).toBeTruthy()
        expect(o.value).toBeTruthy()
      })
    })
  })
})
