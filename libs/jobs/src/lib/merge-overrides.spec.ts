import { describe, expect, it } from 'vitest'
import { mergeJobsWithOverrides } from './merge-overrides'
import type { JobDefinition, JobOverrideRecord } from './types'

function job(overrides: Partial<JobDefinition> = {}): JobDefinition {
  return {
    id: 'demo-job',
    name: 'Demo Job',
    description: 'Тестовая задача',
    schedule: '0 3 * * *',
    handler: async () => {},
    ...overrides,
  }
}

describe('mergeJobsWithOverrides', () => {
  it('без оверрайдов возвращает значения из кода как есть', () => {
    const [result] = mergeJobsWithOverrides([job()], [])

    expect(result).toMatchObject({
      schedule: '0 3 * * *',
      enabled: true,
      hasOverride: false,
    })
  })

  it('оверрайд расписания перекрывает значение из кода', () => {
    const overrides: JobOverrideRecord[] = [{ jobId: 'demo-job', schedule: '0 5 * * *', enabled: null }]
    const [result] = mergeJobsWithOverrides([job()], overrides)

    expect(result.schedule).toBe('0 5 * * *')
    expect(result.hasOverride).toBe(true)
  })

  it('оверрайд enabled=false выключает задачу, даже если в коде enabled по умолчанию', () => {
    const overrides: JobOverrideRecord[] = [{ jobId: 'demo-job', schedule: null, enabled: false }]
    const [result] = mergeJobsWithOverrides([job()], overrides)

    expect(result.enabled).toBe(false)
    expect(result.hasOverride).toBe(true)
  })

  it('оверрайд с обоими полями null не считается оверрайдом', () => {
    const overrides: JobOverrideRecord[] = [{ jobId: 'demo-job', schedule: null, enabled: null }]
    const [result] = mergeJobsWithOverrides([job()], overrides)

    expect(result.hasOverride).toBe(false)
    expect(result.schedule).toBe('0 3 * * *')
  })

  it('задача без явного enabled в коде по умолчанию включена', () => {
    const [result] = mergeJobsWithOverrides([job({ enabled: undefined })], [])

    expect(result.enabled).toBe(true)
  })

  it('задача, явно выключенная в коде, остаётся выключенной без оверрайда', () => {
    const [result] = mergeJobsWithOverrides([job({ enabled: false })], [])

    expect(result.enabled).toBe(false)
  })

  it('снятая из реестра кода задача не появляется в результате, даже если для неё есть оверрайд', () => {
    // Источник истины по СОСТАВУ задач — код (PLAN-INFRA §75/§56): оверрайд для id, которого
    // больше нет в defineJob-реестре, просто игнорируется, а не воскрешает задачу.
    const overrides: JobOverrideRecord[] = [{ jobId: 'removed-job', schedule: '0 0 * * *', enabled: true }]

    expect(mergeJobsWithOverrides([job()], overrides)).toHaveLength(1)
  })

  it('несколько задач с оверрайдами на часть из них', () => {
    const jobs = [job({ id: 'job-a' }), job({ id: 'job-b' }), job({ id: 'job-c' })]
    const overrides: JobOverrideRecord[] = [{ jobId: 'job-b', schedule: '0 6 * * *', enabled: null }]

    const result = mergeJobsWithOverrides(jobs, overrides)

    expect(result.map((r) => r.hasOverride)).toEqual([false, true, false])
    expect(result.find((r) => r.definition.id === 'job-b')?.schedule).toBe('0 6 * * *')
  })
})
