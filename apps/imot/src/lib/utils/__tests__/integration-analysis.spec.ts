import { describe, expect, it } from 'vitest'
import type { ClientProfiles } from '../integration-analysis'
import { analyzeIntegration, formatIntegrationReport } from '../integration-analysis'

// Профили с проблемами — максимум пересечений
const problematicProfiles: ClientProfiles = {
  numerology: {
    personalityNumber: 3,
    destinyNumber: 5,
    soulNumber: 7,
    talents: JSON.stringify([3, 5, 7]),
    karmicLessons: JSON.stringify([13, 16]),
  },
  neuroPsych: {
    behaviorPatterns: 'избегание конфликтов',
    cognitiveStyle: 'аналитический',
    defenseMechanisms: 'контроль, рационализация',
    emotionalPatterns: 'подавление гнева',
  },
  energy: {
    rootChakra: 3,
    sacralChakra: 4,
    solarPlexusChakra: 3,
    heartChakra: 4,
    throatChakra: 3,
    thirdEyeChakra: 6,
    crownChakra: 5,
    moneyChannelLevel: 3,
    relationshipEnergy: 4,
  },
  body: {
    tensionMap: 'таз, диафрагма, шея, плечи',
    psychosomaticIssues: 'головные боли',
    breathingPatterns: 'поверхностное дыхание',
  },
  style: {
    colorType: 'WINTER',
    primaryArchetype: 'HERO',
    secondaryArchetype: 'MAGICIAN',
    authenticityLevel: 3,
  },
}

// Здоровые профили
const healthyProfiles: ClientProfiles = {
  numerology: {
    personalityNumber: 10,
    destinyNumber: 15,
    soulNumber: 12,
    talents: JSON.stringify([8, 10, 15]),
    karmicLessons: JSON.stringify([]),
  },
  energy: {
    rootChakra: 8,
    sacralChakra: 7,
    solarPlexusChakra: 8,
    heartChakra: 9,
    throatChakra: 8,
    thirdEyeChakra: 7,
    crownChakra: 8,
    moneyChannelLevel: 7,
    relationshipEnergy: 8,
  },
  style: {
    colorType: 'SPRING',
    primaryArchetype: 'CREATOR',
    authenticityLevel: 9,
  },
}

describe('analyzeIntegration', () => {
  it('возвращает overallIntegration 0-100', () => {
    const result = analyzeIntegration(problematicProfiles)
    expect(result.overallIntegration).toBeGreaterThanOrEqual(0)
    expect(result.overallIntegration).toBeLessThanOrEqual(100)
  })

  it('5 из 5 профилей → 100% целостность', () => {
    const result = analyzeIntegration(problematicProfiles)
    expect(result.overallIntegration).toBe(100)
  })

  it('3 из 5 профилей → 60% целостность', () => {
    const result = analyzeIntegration(healthyProfiles)
    expect(result.overallIntegration).toBe(60)
  })

  it('пустые профили → 0% целостность', () => {
    const result = analyzeIntegration({})
    expect(result.overallIntegration).toBe(0)
  })

  it('находит пересечения при проблемных профилях', () => {
    const result = analyzeIntegration(problematicProfiles)
    expect(result.intersections.length).toBeGreaterThan(0)
  })

  it('пересечения имеют приоритет', () => {
    const result = analyzeIntegration(problematicProfiles)
    result.intersections.forEach((i) => {
      expect(['high', 'medium', 'low']).toContain(i.priority)
    })
  })

  it('находит паттерны контроля', () => {
    const result = analyzeIntegration(problematicProfiles)
    const controlPattern = result.patterns.find((p) => p.pattern.includes('контрол'))
    expect(controlPattern).toBeDefined()
  })

  it('находит паттерн подавленного самовыражения', () => {
    const result = analyzeIntegration(problematicProfiles)
    const expressionPattern = result.patterns.find((p) => p.pattern.includes('самовыражени'))
    expect(expressionPattern).toBeDefined()
  })

  it('определяет области роста', () => {
    const result = analyzeIntegration(problematicProfiles)
    expect(result.growthAreas.length).toBeGreaterThan(0)
  })

  it('определяет ресурсы для здоровых профилей', () => {
    const result = analyzeIntegration(healthyProfiles)
    expect(result.resources.length).toBeGreaterThan(0)
  })

  it('содержит рекомендации', () => {
    const result = analyzeIntegration(problematicProfiles)
    expect(result.recommendations.length).toBeGreaterThan(0)
  })

  it('рекомендует сессию при 3+ высокоприоритетных пересечениях', () => {
    const result = analyzeIntegration(problematicProfiles)
    const highPriority = result.intersections.filter((i) => i.priority === 'high')
    if (highPriority.length >= 3) {
      expect(result.recommendations.some((r) => r.includes('сессия'))).toBe(true)
    }
  })
})

describe('formatIntegrationReport', () => {
  it('содержит заголовок и процент', () => {
    const analysis = analyzeIntegration(problematicProfiles)
    const report = formatIntegrationReport(analysis)
    expect(report).toContain('АНАЛИЗ ИНТЕГРАЦИИ')
    expect(report).toContain('100%')
  })

  it('содержит секции отчёта', () => {
    const analysis = analyzeIntegration(problematicProfiles)
    const report = formatIntegrationReport(analysis)
    expect(report).toContain('ТОЧКИ ПЕРЕСЕЧЕНИЯ')
    expect(report).toContain('ВЫЯВЛЕННЫЕ ПАТТЕРНЫ')
    expect(report).toContain('РЕСУРСЫ')
    expect(report).toContain('ОБЛАСТИ РОСТА')
    expect(report).toContain('РЕКОМЕНДАЦИИ')
  })
})
