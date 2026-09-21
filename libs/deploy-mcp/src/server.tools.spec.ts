import { HARD_GATED_APPS } from '@letar/infra-config'
import { connectedClient, expectValidationError, textOf } from '@letar/mcp-test-kit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { agentRequest } from './client'
import { changedPathsSince, isAffectedSince, originMainSha } from './config'
import { createDeployMcpServer } from './server'

// Мокаем сеть (SSH-туннель → dashboard-agent) и git/nx — сам инструмент гоняем настоящим MCP-клиентом,
// как в .claude/docs/mcp-tool-handler-testing-pattern.md.
vi.mock('./client', () => ({ agentRequest: vi.fn() }))
vi.mock('./config', () => ({
  originMainSha: vi.fn(),
  isAffectedSince: vi.fn(),
  changedPathsSince: vi.fn(),
}))

const E2E_SHA = 'a'.repeat(40)
const ORIGIN_SHA = 'b'.repeat(40)
const connect = () => connectedClient(createDeployMcpServer)

describe('run_e2e — фильтры прогона', () => {
  beforeEach(() => {
    vi.mocked(agentRequest).mockResolvedValue({
      success: true,
      data: { runId: 'run-1', app: 'svoichuzhie', started: true },
    })
  })

  it('передаёт project/grep/workers в тело запроса к dashboard-agent', async () => {
    const { client } = await connect()
    await client.callTool({
      name: 'run_e2e',
      arguments: {
        app: 'svoichuzhie',
        baseUrl: 'https://svoichuzhie-stage.s1.letar.best',
        project: 'chromium',
        grep: '07-blog',
        workers: 1,
      },
    })
    expect(agentRequest).toHaveBeenCalledWith('s1', {
      method: 'POST',
      path: '/api/e2e/run',
      body: {
        app: 'svoichuzhie',
        baseUrl: 'https://svoichuzhie-stage.s1.letar.best',
        project: 'chromium',
        grep: '07-blog',
        workers: 1,
      },
    })
  })

  // Регрессия 2026-09-19: вызывающий передал несуществующий `extraArgs`, zod молча выбросил
  // неизвестный ключ, и прогон пошёл по всему набору (58 тестов) вместо точечного.
  it('отвергает неизвестный аргумент (extraArgs), а не молча запускает весь набор', async () => {
    const { client } = await connect()
    await expectValidationError(client, 'run_e2e', {
      app: 'svoichuzhie',
      baseUrl: 'https://svoichuzhie-stage.s1.letar.best',
      extraArgs: '--project=chromium --grep 07-blog',
    })
    expect(agentRequest).not.toHaveBeenCalled()
  })

  it('в ответе видно, какие фильтры реально применены', async () => {
    const { client } = await connect()
    const result = await client.callTool({
      name: 'run_e2e',
      arguments: {
        app: 'svoichuzhie',
        baseUrl: 'https://svoichuzhie-stage.s1.letar.best',
        project: 'chromium',
        grep: '07-blog',
      },
    })
    expect(textOf(result)).toContain('project=chromium')
    expect(textOf(result)).toContain('grep=07-blog')
  })

  it('без фильтров в ответе прямо сказано, что идёт весь набор', async () => {
    const { client } = await connect()
    const result = await client.callTool({
      name: 'run_e2e',
      arguments: { app: 'svoichuzhie', baseUrl: 'https://svoichuzhie-stage.s1.letar.best' },
    })
    expect(textOf(result)).toContain('весь набор')
  })
})

describe('deploy_app — отказ hard e2e-gate', () => {
  const app = HARD_GATED_APPS[0] as string

  beforeEach(() => {
    vi.mocked(originMainSha).mockReturnValue(ORIGIN_SHA)
    vi.mocked(isAffectedSince).mockReturnValue(true)
    vi.mocked(changedPathsSince).mockReturnValue(['apps/svoichuzhie', 'PLAN.md'])
    vi.mocked(agentRequest).mockResolvedValue({
      success: true,
      data: { lastStatus: { commitSha: E2E_SHA, passed: true, timestamp: new Date().toISOString() } },
    })
  })

  it('называет оба сравнивавшихся SHA, их источник и что локальный HEAD не участвует', async () => {
    const { client } = await connect()
    const result = await client.callTool({ name: 'deploy_app', arguments: { app } })
    const out = textOf(result)
    expect(result.isError).toBe(true)
    expect(out).toContain(E2E_SHA)
    expect(out).toContain(ORIGIN_SHA)
    expect(out).toContain('origin/main')
    expect(out).toContain('локальный HEAD')
    expect(out).toContain(`e2e_status({ app: "${app}" })`)
    expect(out).toContain(`git diff --stat ${E2E_SHA.slice(0, 7)}..${ORIGIN_SHA.slice(0, 7)}`)
  })

  it('перечисляет изменённые между SHA пути', async () => {
    const { client } = await connect()
    const out = textOf(await client.callTool({ name: 'deploy_app', arguments: { app } }))
    expect(out).toContain('apps/svoichuzhie')
    expect(out).toContain('PLAN.md')
  })
})
