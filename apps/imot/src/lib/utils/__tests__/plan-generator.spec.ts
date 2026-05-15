import { describe, expect, it } from 'vitest'
import type { ClientProfiles } from '../integration-analysis'
import { analyzeIntegration } from '../integration-analysis'
import { formatPlanSummary, generatePlan } from '../plan-generator'

const fullProfiles: ClientProfiles = {
  numerology: {
    personalityNumber: 5,
    destinyNumber: 8,
    soulNumber: 3,
    talents: JSON.stringify([5, 8, 3]),
    karmicLessons: JSON.stringify([13]),
  },
  neuroPsych: {
    behaviorPatterns: 'перфекционизм',
    cognitiveStyle: 'системный',
    defenseMechanisms: 'контроль',
    emotionalPatterns: 'тревожность',
  },
  energy: {
    rootChakra: 4,
    sacralChakra: 3,
    solarPlexusChakra: 4,
    heartChakra: 6,
    throatChakra: 3,
    thirdEyeChakra: 7,
    crownChakra: 5,
    moneyChannelLevel: 4,
    relationshipEnergy: 5,
  },
  body: {
    tensionMap: 'плечи, шея',
    psychosomaticIssues: 'головные боли',
    breathingPatterns: 'поверхностное',
  },
  style: {
    colorType: 'SUMMER',
    primaryArchetype: 'RULER',
    authenticityLevel: 4,
  },
}

const minimalProfiles: ClientProfiles = {
  numerology: {
    personalityNumber: 1,
    destinyNumber: 1,
    soulNumber: 1,
    talents: null,
    karmicLessons: null,
  },
}

describe('generatePlan', () => {
  it('генерирует план с 5 профилями → этап INTEGRATION', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    expect(plan.currentStage).toBe('INTEGRATION')
  })

  it('генерирует план с 1 профилем → этап DIAGNOSTICS', () => {
    const analysis = analyzeIntegration(minimalProfiles)
    const plan = generatePlan(minimalProfiles, analysis)
    expect(plan.currentStage).toBe('DIAGNOSTICS')
  })

  it('содержит описания всех этапов', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    expect(plan.diagnosticsDescription).toBeTruthy()
    expect(plan.integrationDescription).toBeTruthy()
    expect(plan.strategyDescription).toBeTruthy()
    expect(plan.practiceDescription).toBeTruthy()
    expect(plan.expectedResults).toBeTruthy()
  })

  it('рекомендует практики при заблокированных чакрах', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    expect(plan.recommendedPractices.length).toBeGreaterThan(0)
    // Есть практика для горловой чакры (throatChakra: 3)
    const throatPractice = plan.recommendedPractices.find((p) => p.title.includes('самовыражени'))
    expect(throatPractice).toBeDefined()
  })

  it('всегда содержит общие практики (дневник, медитация)', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    const diary = plan.recommendedPractices.find((p) => p.title.includes('дневник'))
    const meditation = plan.recommendedPractices.find((p) => p.title.includes('едитаци'))
    expect(diary).toBeDefined()
    expect(meditation).toBeDefined()
  })

  it('длительность минимум 12 недель', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    expect(plan.estimatedDuration).toBeGreaterThanOrEqual(12)
  })

  it('длительность увеличивается с количеством проблем', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    const highPriority = analysis.intersections.filter((i) => i.priority === 'high').length
    expect(plan.estimatedDuration).toBe(12 + highPriority * 4)
  })

  it('ключевые точки содержат темы пересечений', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    expect(plan.keyPoints.length).toBeGreaterThan(0)
  })

  it('приоритеты — подмножество областей роста', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    plan.priorities.forEach((p) => {
      expect(analysis.growthAreas).toContain(p)
    })
  })

  it('практики для тела при наличии профиля', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    const bodyPractices = plan.recommendedPractices.filter((p) => p.level === 'body')
    expect(bodyPractices.length).toBeGreaterThan(0)
  })

  it('практика дыхания при поверхностном дыхании', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    const breathing = plan.recommendedPractices.find((p) => p.title.includes('ыхательн'))
    expect(breathing).toBeDefined()
  })
})

describe('formatPlanSummary', () => {
  it('содержит заголовок и длительность', () => {
    const analysis = analyzeIntegration(fullProfiles)
    const plan = generatePlan(fullProfiles, analysis)
    const summary = formatPlanSummary(plan)
    expect(summary).toContain('ПЛАН ТРАНСФОРМАЦИИ')
    expect(summary).toContain('недель')
  })
})
