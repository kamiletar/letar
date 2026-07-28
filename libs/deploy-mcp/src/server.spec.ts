import { describe, expect, it } from 'vitest'
import type { AgentResponse } from './client'
import { evaluateE2eGate } from './server'

const HEAD = 'a'.repeat(40)
const OTHER_SHA = 'b'.repeat(40)
const FRESH_TIMESTAMP = new Date().toISOString()
const STALE_TIMESTAMP = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()

function okStatus(overrides: Partial<{ commitSha: string; passed: boolean; timestamp: string }> = {}) {
  return {
    success: true as const,
    data: {
      lastStatus: { commitSha: HEAD, passed: true, timestamp: FRESH_TIMESTAMP, ...overrides },
    },
  }
}

describe('evaluateE2eGate', () => {
  it('не блокирует не-hard-gated приложение даже при полностью отсутствующих данных', async () => {
    const fetchStatus = async () => ({ success: true as const, data: { lastStatus: null } })
    const result = await evaluateE2eGate('mandala', false, fetchStatus, () => HEAD)
    expect(result.blocked).toBe(false)
    expect(result.reasons).toHaveLength(1)
  })

  it('не даёт причин и не блокирует hard-gated приложение с зелёным свежим прогоном на том же коммите', async () => {
    const fetchStatus = async () => okStatus()
    const result = await evaluateE2eGate('archetest', true, fetchStatus, () => HEAD)
    expect(result).toEqual({ blocked: false, reasons: [] })
  })

  it('блокирует hard-gated приложение без единого прогона e2e', async () => {
    const fetchStatus = async (): Promise<AgentResponse<{ lastStatus: null }>> => ({
      success: true,
      data: { lastStatus: null },
    })
    const result = await evaluateE2eGate('archetest', true, fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons[0]).toMatch(/ни разу не прогонялся/)
  })

  it('блокирует hard-gated приложение, если последний прогон упал', async () => {
    const fetchStatus = async () => okStatus({ passed: false })
    const result = await evaluateE2eGate('archetest', true, fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('УПАЛ'))).toBe(true)
  })

  it('блокирует hard-gated приложение, если e2e прогонялся не на том коммите', async () => {
    const fetchStatus = async () => okStatus({ commitSha: OTHER_SHA })
    const result = await evaluateE2eGate('archetest', true, fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('не тот же коммит'))).toBe(true)
  })

  it('блокирует hard-gated приложение с прогоном старше 24 часов', async () => {
    const fetchStatus = async () => okStatus({ timestamp: STALE_TIMESTAMP })
    const result = await evaluateE2eGate('archetest', true, fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('старше 24ч'))).toBe(true)
  })

  it('блокирует hard-gated приложение при ошибке получения статуса (fail-closed, не fail-open)', async () => {
    const fetchStatus = async () => ({ success: false as const, error: 'staging недоступен' })
    const result = await evaluateE2eGate('archetest', true, fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons[0]).toMatch(/не удалось получить статус/)
  })

  it('блокирует hard-gated приложение, если запрос статуса бросает исключение (сеть/туннель упали)', async () => {
    const fetchStatus = async (): Promise<AgentResponse<{ lastStatus: null }>> => {
      throw new Error('ECONNREFUSED')
    }
    const result = await evaluateE2eGate('archetest', true, fetchStatus, () => HEAD)
    expect(result.blocked).toBe(true)
    expect(result.reasons[0]).toMatch(/ошибка проверки e2e-статуса/)
  })

  it('блокирует hard-gated приложение, если локальный HEAD не определить (не может подтвердить коммит)', async () => {
    const fetchStatus = async () => okStatus()
    const result = await evaluateE2eGate('archetest', true, fetchStatus, () => {
      throw new Error('not a git repository')
    })
    expect(result.blocked).toBe(true)
    expect(result.reasons.some((r) => r.includes('не удалось определить локальный HEAD'))).toBe(true)
  })

  it('НЕ блокирует не-hard-gated приложение при тех же условиях провала (warn-only остаётся прежним)', async () => {
    const fetchStatus = async () => okStatus({ passed: false, commitSha: OTHER_SHA, timestamp: STALE_TIMESTAMP })
    const result = await evaluateE2eGate('mandala', false, fetchStatus, () => HEAD)
    expect(result.blocked).toBe(false)
    expect(result.reasons.length).toBeGreaterThanOrEqual(3)
  })

  it('не-hard-gated приложение с ошибкой HEAD не добавляет причину про коммит (пропускает сверку тихо)', async () => {
    const fetchStatus = async () => okStatus()
    const result = await evaluateE2eGate('mandala', false, fetchStatus, () => {
      throw new Error('not a git repository')
    })
    expect(result.blocked).toBe(false)
    expect(result.reasons).toHaveLength(0)
  })
})
