import { describe, expect, it } from 'vitest'
import type { CronJob } from './cron'
import { applyRetirement } from './cron'

function job(id: string): CronJob {
  return {
    id,
    name: id,
    app: 'dashboard',
    endpoint: '/api/cron/x',
    schedule: '0 0 * * *',
    description: '',
    enabled: true,
  }
}

describe('applyRetirement (PLAN-INFRA.md §56 — вывод cron-задачи из эксплуатации через репозиторий)', () => {
  it('не трогает список, если RETIRED_JOB_IDS пуст', () => {
    const jobs = [job('a'), job('b')]
    const result = applyRetirement(jobs, [])
    expect(result).toEqual({ jobs, removed: [] })
    expect(result.jobs).toBe(jobs) // та же ссылка — нет лишней аллокации, когда ретира нет
  })

  it('удаляет только перечисленные id, остальные не трогает', () => {
    const jobs = [job('a'), job('b'), job('c')]
    const result = applyRetirement(jobs, ['b'])
    expect(result.jobs.map((j) => j.id)).toEqual(['a', 'c'])
    expect(result.removed).toEqual(['b'])
  })

  it('не падает и ничего не удаляет, если id из RETIRED_JOB_IDS уже отсутствует на сервере', () => {
    const jobs = [job('a')]
    const result = applyRetirement(jobs, ['zombie-job-давно-удалён-вручную'])
    expect(result.jobs).toEqual(jobs)
    expect(result.removed).toEqual([])
  })

  it('удаляет несколько задач разом', () => {
    const jobs = [job('a'), job('b'), job('c'), job('d')]
    const result = applyRetirement(jobs, ['a', 'c'])
    expect(result.jobs.map((j) => j.id)).toEqual(['b', 'd'])
    expect(result.removed).toEqual(['a', 'c'])
  })
})
