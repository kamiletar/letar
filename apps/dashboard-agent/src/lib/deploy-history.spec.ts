/**
 * Тесты appendOutput: вытеснение старых строк лога не уносит таблицу маршрутов Next.js
 * (PLAN-INFRA-6.md §157). Redis подменён — персистенция здесь не предмет проверки.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./deploy-history-redis', () => ({
  flushPersist: vi.fn(),
  persistDeploy: vi.fn(async () => undefined),
  persistIndex: vi.fn(async () => undefined),
  rehydrateFromRedis: vi.fn(async () => undefined),
  schedulePersist: vi.fn(),
}))

import { appendOutput, createDeploy, deployHistory, MAX_OUTPUT_LINES } from './deploy-history'

const TABLE = [
  'Route (app)',
  '┌ ○ /',
  '└ ƒ /api/health',
  '',
  '○  (Static)   prerendered as static content',
  'ƒ  (Dynamic)  server-rendered on demand',
]

describe('appendOutput + захват таблицы маршрутов', () => {
  beforeEach(() => {
    deployHistory.length = 0
  })

  it('новый деплой стартует с пустым routeTables', () => {
    const deploy = createDeploy({ running: true, appName: 'kami' })
    expect(deploy.routeTables).toEqual([])
  })

  it('таблица переживает вытеснение: в output её уже нет, в routeTables — есть, со сквозными номерами', () => {
    const deploy = createDeploy({ running: true, appName: 'kami' })
    for (let i = 0; i < 40; i++) {
      appendOutput(deploy, `подготовка ${i}`)
    }
    for (const line of TABLE) {
      appendOutput(deploy, line)
    }
    // Хвост s1-деплоя (docker build/push, release на s2), заведомо больше лимита лога
    for (let i = 0; i < MAX_OUTPUT_LINES + 500; i++) {
      appendOutput(deploy, `хвост ${i}`)
    }

    expect(deploy.output).toHaveLength(MAX_OUTPUT_LINES)
    expect(deploy.truncatedLines).toBeGreaterThan(40 + TABLE.length)
    expect(deploy.output.some((l) => l.includes('Route (app)'))).toBe(false)

    expect(deploy.routeTables).toHaveLength(1)
    const [block] = deploy.routeTables
    expect(block?.complete).toBe(true)
    expect(block?.fromLine).toBe(40)
    expect(block?.toLine).toBe(40 + TABLE.length - 1)
    expect(block?.lines).toEqual(TABLE.filter((l) => l !== ''))
  })

  it('номера строк учитывают уже вытесненные: таблица в середине переполненного лога', () => {
    const deploy = createDeploy({ running: true, appName: 'kami' })
    for (let i = 0; i < MAX_OUTPUT_LINES + 100; i++) {
      appendOutput(deploy, `шум ${i}`)
    }
    const expectedFrom = deploy.truncatedLines + deploy.output.length
    for (const line of TABLE) {
      appendOutput(deploy, line)
    }
    expect(deploy.routeTables[0]?.fromLine).toBe(expectedFrom)
    // Строка с этим сквозным номером в output действительно заголовок
    expect(deploy.output[expectedFrom - deploy.truncatedLines]).toBe('Route (app)')
  })

  it('стандартный вывод и stderr с префиксом «⚠️ » не мешают: заголовок ищется подстрокой', () => {
    const deploy = createDeploy({ running: true, appName: 'kami' })
    appendOutput(deploy, '⚠️ Route (app)')
    appendOutput(deploy, '⚠️ ┌ ○ /')
    appendOutput(deploy, '⚠️ ○  (Static)  prerendered as static content')
    expect(deploy.routeTables[0]?.complete).toBe(true)
  })
})
