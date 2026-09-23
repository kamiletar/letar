import { describe, expect, it } from 'vitest'
import type { AgentResponse } from './client'
import { evaluateE2eGate } from './server'

const HEAD = 'a'.repeat(40)
const OTHER_SHA = 'b'.repeat(40)
const FRESH_TIMESTAMP = new Date().toISOString()
const STALE_TIMESTAMP = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()

function okStatus(
  overrides: Partial<{
    commitSha: string
    passed: boolean
    timestamp: string
    filtered: boolean
    grep: string
    project: string
  }> = {},
) {
  return {
    success: true as const,
    data: {
      lastStatus: { commitSha: HEAD, passed: true, timestamp: FRESH_TIMESTAMP, ...overrides },
    },
  }
}

describe('evaluateE2eGate', () => {
  it('не даёт причин и не блокирует приложение с зелёным свежим прогоном на том же коммите', async () => {
    const fetchStatus = async () => okStatus()
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD)
    expect(result).toEqual({ blocked: false, reasons: [] })
  })

  it('блокирует приложение без единого прогона e2e', async () => {
    const fetchStatus = async (): Promise<AgentResponse<{ lastStatus: null }>> => ({
      success: true,
      data: { lastStatus: null },
    })
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons[0]).toMatch(/ни разу не прогонялся/)
  })

  it('блокирует приложение, если последний прогон упал', async () => {
    const fetchStatus = async () => okStatus({ passed: false })
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('УПАЛ'))).toBe(true)
  })

  it('блокирует зелёный статус от фильтрованного прогона (grep/project) — набор был неполным', async () => {
    const fetchStatus = async () => okStatus({ filtered: true, grep: 'sales-funnel-won', project: 'chromium' })
    const result = await evaluateE2eGate('domwellbes', fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('фильтрованным') && r.includes('grep=sales-funnel-won'))).toBe(
      true,
    )
  })

  it('упавший фильтрованный прогон блокирует и называет фильтры в причине', async () => {
    const fetchStatus = async () => okStatus({ passed: false, filtered: true, project: 'chromium' })
    const result = await evaluateE2eGate('domwellbes', fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('УПАЛ') && r.includes('project=chromium'))).toBe(true)
  })

  it('статус без поля filtered (записан до 2026-09-23) читается как полный прогон', async () => {
    const fetchStatus = async () => okStatus()
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD)
    expect(result).toEqual({ blocked: false, reasons: [] })
  })

  it('filtered: false (полный прогон) не блокирует', async () => {
    const fetchStatus = async () => okStatus({ filtered: false })
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD)
    expect(result).toEqual({ blocked: false, reasons: [] })
  })

  it('блокирует приложение, если e2e прогонялся не на том коммите И приложение affected (§51)', async () => {
    const fetchStatus = async () => okStatus({ commitSha: OTHER_SHA })
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD, () => true)
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('изменился с прогона'))).toBe(true)
  })

  it('НЕ блокирует приложение при другом коммите, если приложение НЕ affected (§51, посторонний коммит)', async () => {
    const fetchStatus = async () => okStatus({ commitSha: OTHER_SHA })
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD, () => false)
    expect(result).toEqual({ blocked: false, reasons: [] })
  })

  it('блокирует приложение (fail-closed), если isAffectedSince сам бросает исключение', async () => {
    const fetchStatus = async () => okStatus({ commitSha: OTHER_SHA })
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD, () => {
      throw new Error('git diff failed: shallow clone')
    })
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('не удалось проверить nx affected'))).toBe(true)
  })

  it('блокирует приложение с прогоном старше 24 часов', async () => {
    const fetchStatus = async () => okStatus({ timestamp: STALE_TIMESTAMP })
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('старше 24ч'))).toBe(true)
  })

  it('блокирует приложение при ошибке получения статуса (fail-closed, не fail-open)', async () => {
    const fetchStatus = async () => ({ success: false as const, error: 'staging недоступен' })
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons[0]).toMatch(/не удалось получить статус/)
  })

  it('блокирует приложение, если запрос статуса бросает исключение (сеть/туннель упали)', async () => {
    const fetchStatus = async (): Promise<AgentResponse<{ lastStatus: null }>> => {
      throw new Error('ECONNREFUSED')
    }
    const result = await evaluateE2eGate('archetest', fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons[0]).toMatch(/ошибка проверки e2e-статуса/)
  })

  it('блокирует приложение, если локальный HEAD не определить (не может подтвердить коммит)', async () => {
    const fetchStatus = async () => okStatus()
    const result = await evaluateE2eGate('archetest', fetchStatus, () => {
      throw new Error('not a git repository')
    })
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('не удалось определить локальный HEAD'))).toBe(true)
  })
})
