import { describe, expect, it } from 'vitest'
import { PlanFormSchema } from '../plan-form.schema'

describe('PlanFormSchema', () => {
  it('принимает минимальные валидные данные', () => {
    const result = PlanFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      primaryRequest: 'Тревожность и панические атаки',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currentStage).toBe('DIAGNOSTICS') // дефолт
      expect(result.data.isActive).toBe(true) // дефолт
      expect(result.data.isCompleted).toBe(false) // дефолт
    }
  })

  it('принимает все поля', () => {
    const result = PlanFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      currentStage: 'INTEGRATION',
      primaryRequest: 'Тревожность',
      changeReason: 'Уточнение запроса',
      diagnosticsDescription: 'Диагностика пройдена',
      integrationDescription: 'Интеграция в процессе',
      strategyDescription: 'Стратегия определена',
      practiceDescription: 'Практики назначены',
      expectedResults: 'Снижение тревожности',
      keyPoints: '["точка 1","точка 2"]',
      priorities: '["приоритет 1"]',
      startDate: '2026-01-01',
      expectedEndDate: '2026-06-01',
      isActive: true,
      isCompleted: false,
      notes: 'Заметки специалиста',
    })
    expect(result.success).toBe(true)
  })

  it('отклоняет пустой clientId', () => {
    const result = PlanFormSchema.safeParse({
      clientId: '',
      primaryRequest: 'Тревожность',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет пустой primaryRequest', () => {
    const result = PlanFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      primaryRequest: '',
    })
    expect(result.success).toBe(false)
  })

  it('отклоняет невалидный currentStage', () => {
    const result = PlanFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      primaryRequest: 'Тревожность',
      currentStage: 'INVALID_STAGE',
    })
    expect(result.success).toBe(false)
  })

  it('принимает все этапы трансформации', () => {
    for (const stage of ['DIAGNOSTICS', 'INTEGRATION', 'STRATEGY', 'PRACTICE', 'RESULT']) {
      const result = PlanFormSchema.safeParse({
        clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
        primaryRequest: 'Тревожность',
        currentStage: stage,
      })
      expect(result.success).toBe(true)
    }
  })

  it('strip удаляет лишние поля', () => {
    const result = PlanFormSchema.safeParse({
      clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
      primaryRequest: 'Тревожность',
      $ACTION_ID: 'xxx',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('$ACTION_ID')
    }
  })
})
