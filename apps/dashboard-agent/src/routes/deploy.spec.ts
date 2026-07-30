/**
 * Тесты чистых функций структурированного прогресса деплоя (PLAN-INFRA.md §38):
 * парсинг фаз из лога (applyPhaseLine) и watchdog залипания (computeStalled).
 * Роуты Fastify (deployRoutes) не тестируются напрямую — это тонкие обёртки над
 * этими функциями + spawn, см. паттерн server.spec.ts в libs/deploy-mcp.
 */

import { describe, expect, it } from 'vitest'
import { applyPhaseLine, computeStalled, type DeployPhase } from './deploy'

describe('applyPhaseLine', () => {
  it('открывает фазу на ::phase:name:start', () => {
    const phases: DeployPhase[] = []
    applyPhaseLine(phases, '::phase:build:start', () => 'T0')
    expect(phases).toEqual([{ name: 'build', startedAt: 'T0' }])
  })

  it('закрывает открытую фазу на ::phase:name:ok с durationMs', () => {
    const phases: DeployPhase[] = []
    applyPhaseLine(phases, '::phase:build:start', () => '2026-07-30T00:00:00.000Z')
    applyPhaseLine(phases, '::phase:build:ok', () => '2026-07-30T00:00:05.000Z')
    expect(phases).toEqual([
      {
        name: 'build',
        startedAt: '2026-07-30T00:00:00.000Z',
        endedAt: '2026-07-30T00:00:05.000Z',
        ok: true,
        durationMs: 5000,
      },
    ])
  })

  it('закрывает открытую фазу на ::phase:name:fail с ok: false', () => {
    const phases: DeployPhase[] = []
    applyPhaseLine(phases, '::phase:rollout:start', () => '2026-07-30T00:00:00.000Z')
    applyPhaseLine(phases, '::phase:rollout:fail', () => '2026-07-30T00:00:01.000Z')
    expect(phases[0]?.ok).toBe(false)
  })

  it('игнорирует ok/fail без соответствующей открытой фазы', () => {
    const phases: DeployPhase[] = []
    applyPhaseLine(phases, '::phase:build:ok', () => 'T1')
    expect(phases).toEqual([])
  })

  it('игнорирует произвольную прозу лога', () => {
    const phases: DeployPhase[] = []
    applyPhaseLine(phases, '🔨 Building kami with build:production (cache disabled)...', () => 'T0')
    applyPhaseLine(phases, '## rollout kami', () => 'T0')
    expect(phases).toEqual([])
  })

  it('парсит уже существующие [step-id] строки libs/deploy-engine как мгновенную фазу', () => {
    const phases: DeployPhase[] = []
    applyPhaseLine(phases, '✅ [wait-healthy] kami-app-2 стал healthy', () => 'T0')
    expect(phases).toEqual([{ name: 'wait-healthy', startedAt: 'T0', endedAt: 'T0', ok: true, durationMs: 0 }])
  })

  it('парсит ❌ [step-id] как проваленную фазу', () => {
    const phases: DeployPhase[] = []
    applyPhaseLine(phases, '❌ [smoke-test] wget вернул ошибку', () => 'T0')
    expect(phases[0]?.ok).toBe(false)
    expect(phases[0]?.name).toBe('smoke-test')
  })

  it('несколько подряд идущих фаз накапливаются в массиве по порядку', () => {
    const phases: DeployPhase[] = []
    let t = 0
    const now = () => String(t++)
    applyPhaseLine(phases, '::phase:build:start', now)
    applyPhaseLine(phases, '::phase:build:ok', now)
    applyPhaseLine(phases, '::phase:rollout:start', now)
    applyPhaseLine(phases, '::phase:rollout:ok', now)
    expect(phases.map((p) => p.name)).toEqual(['build', 'rollout'])
    expect(phases.every((p) => p.ok === true)).toBe(true)
  })
})

describe('computeStalled', () => {
  it('не залипший, если деплой не running', () => {
    const result = computeStalled({ running: false, lastOutputAt: '2026-07-30T00:00:00.000Z', phases: [] })
    expect(result).toEqual({ stalled: false })
  })

  it('не залипший без lastOutputAt', () => {
    const result = computeStalled({ running: true, phases: [] })
    expect(result).toEqual({ stalled: false })
  })

  it('не залипший, пока тишина меньше порога фазы по умолчанию (30с)', () => {
    const lastOutputAt = new Date('2026-07-30T00:00:00.000Z').toISOString()
    const now = () => new Date('2026-07-30T00:00:20.000Z').getTime()
    const result = computeStalled({ running: true, lastOutputAt, phases: [] }, now)
    expect(result.stalled).toBe(false)
  })

  it('залипший, когда тишина превышает порог фазы по умолчанию', () => {
    const lastOutputAt = new Date('2026-07-30T00:00:00.000Z').toISOString()
    const now = () => new Date('2026-07-30T00:00:40.000Z').getTime()
    const result = computeStalled({ running: true, lastOutputAt, phases: [] }, now)
    expect(result).toEqual({ stalled: true, stalledSince: lastOutputAt })
  })

  it('build легитимно молчит дольше дефолтного порога (специфичный порог фазы)', () => {
    const lastOutputAt = new Date('2026-07-30T00:00:00.000Z').toISOString()
    // 4 минуты тишины — больше DEFAULT (30с), но меньше порога build (5 мин)
    const now = () => new Date('2026-07-30T00:04:00.000Z').getTime()
    const phases: DeployPhase[] = [{ name: 'build', startedAt: lastOutputAt }]
    const result = computeStalled({ running: true, lastOutputAt, phases }, now)
    expect(result.stalled).toBe(false)
  })

  it('nginx-reload считается залипшим уже через 10с молчания (узкий порог)', () => {
    const lastOutputAt = new Date('2026-07-30T00:00:00.000Z').toISOString()
    const now = () => new Date('2026-07-30T00:00:11.000Z').getTime()
    const phases: DeployPhase[] = [{ name: 'nginx-reload', startedAt: lastOutputAt }]
    const result = computeStalled({ running: true, lastOutputAt, phases }, now)
    expect(result.stalled).toBe(true)
  })

  it('закрытая фаза (endedAt задан) не считается текущей — порог берётся дефолтный', () => {
    const lastOutputAt = new Date('2026-07-30T00:00:00.000Z').toISOString()
    const now = () => new Date('2026-07-30T00:00:40.000Z').getTime()
    const phases: DeployPhase[] = [
      { name: 'build', startedAt: lastOutputAt, endedAt: lastOutputAt, ok: true, durationMs: 0 },
    ]
    // build закрыт → между фазами → DEFAULT_STALL_THRESHOLD_MS (30с) → 40с тишины уже залипание
    const result = computeStalled({ running: true, lastOutputAt, phases }, now)
    expect(result.stalled).toBe(true)
  })
})
