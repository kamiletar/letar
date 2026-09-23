/**
 * Тесты решения «что писать в .last-e2e-status/<app>.json» по итогу e2e-прогона.
 * Инцидент 2026-09-23 (domwellbes): точечный run_e2e (grep sales-funnel-won, project=chromium)
 * записал `passed: true` в тот же файл, который читает прод-гейт, — неполный прогон выглядел
 * как полный зелёный.
 */

import { describe, expect, it } from 'vitest'
import { buildLastStatusUpdate, describeRunScope, isFilteredRun } from './e2e-last-status'

const BASE = { commitSha: 'a'.repeat(40), timestamp: '2026-09-23T17:00:00.000Z', durationMs: 1000 }

describe('isFilteredRun', () => {
  it('прогон без grep и project — полный', () => {
    expect(isFilteredRun({})).toBe(false)
  })

  it('workers не делает прогон неполным', () => {
    expect(isFilteredRun({ workers: 1 })).toBe(false)
  })

  it('grep или project — фильтрованный прогон', () => {
    expect(isFilteredRun({ grep: 'sales-funnel-won' })).toBe(true)
    expect(isFilteredRun({ project: 'chromium' })).toBe(true)
  })

  it('пустые строки не считаются фильтром', () => {
    expect(isFilteredRun({ grep: '', project: '' })).toBe(false)
  })
})

describe('describeRunScope', () => {
  it('перечисляет фильтры', () => {
    expect(describeRunScope({ grep: 'won', project: 'chromium' })).toBe('project=chromium, grep=won')
  })
})

describe('buildLastStatusUpdate', () => {
  it('полный зелёный прогон пишется с filtered: false', () => {
    expect(buildLastStatusUpdate({ ...BASE, passed: true, scope: { workers: 4 } })).toEqual({
      ...BASE,
      passed: true,
      filtered: false,
    })
  })

  it('полный красный прогон пишется', () => {
    expect(buildLastStatusUpdate({ ...BASE, passed: false, scope: {} })).toEqual({
      ...BASE,
      passed: false,
      filtered: false,
    })
  })

  it('фильтрованный зелёный прогон НЕ перезаписывает статус гейта', () => {
    expect(
      buildLastStatusUpdate({ ...BASE, passed: true, scope: { grep: 'sales-funnel-won', project: 'chromium' } }),
    ).toBeNull()
  })

  it('фильтрованный красный прогон пишется как passed: false с пометкой фильтров', () => {
    expect(buildLastStatusUpdate({ ...BASE, passed: false, scope: { grep: 'won', project: 'chromium' } })).toEqual({
      ...BASE,
      passed: false,
      filtered: true,
      grep: 'won',
      project: 'chromium',
    })
  })
})
