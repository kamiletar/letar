import { describe, expect, it } from 'vitest'
import { composePathForApp, runDoctor } from './doctor.js'
import type { CommandResult, DeployEngineExecutor } from './executor.js'

/** In-memory executor для тестов — без реального Docker/файловой системы. */
function memoryExecutor(files: Record<string, string> = {}): DeployEngineExecutor {
  const store = new Map(Object.entries(files))
  return {
    runCommand(): Promise<CommandResult> {
      throw new Error('runCommand не используется в тестах doctor')
    },
    async readFile(path) {
      return store.has(path) ? store.get(path)! : null
    },
    async writeFile(path, content) {
      store.set(path, content)
    },
    async fileExists(path) {
      return store.has(path)
    },
  }
}

const READY_COMPOSE = `
services:
  app:
    image: grandslamcup:\${DEPLOY_TAG:-latest}
    restart: unless-stopped
    env_file:
      - .env.docker
    healthcheck:
      test: ['CMD-SHELL', 'wget -q --spider http://0.0.0.0:3016/ || exit 1']
      interval: 5s
      timeout: 3s
      retries: 30
      start_period: 15s
    stop_grace_period: 30s
    labels:
      letar.rollout: 'true'
    networks:
      kami-network:
        aliases:
          - grandslamcup-app
`

// Реальный текущий production-compose grandslamcup (до миграции на rollout) — эталон «не готово».
const NOT_READY_COMPOSE = `
services:
  app:
    image: grandslamcup:latest
    container_name: grandslamcup-app
    restart: unless-stopped
    ports:
      - '3016:3016'
    env_file:
      - .env.docker
    healthcheck:
      test: ['CMD-SHELL', 'wget -q --spider http://0.0.0.0:3016/ || exit 1']
      interval: 5s
      timeout: 3s
      retries: 30
      start_period: 15s
    networks:
      - kami-network
`

describe('runDoctor', () => {
  it('готовое приложение проходит все обязательные проверки', async () => {
    const executor = memoryExecutor({ [composePathForApp('grandslamcup')]: READY_COMPOSE })
    const report = await runDoctor(executor, 'grandslamcup')

    expect(report.ready).toBe(true)
    const required = report.checks.filter((c) => c.severity === 'required')
    expect(required.every((c) => c.passed)).toBe(true)
  })

  it('текущий production-compose grandslamcup не готов к rollout (эталон регрессии)', async () => {
    const executor = memoryExecutor({ [composePathForApp('grandslamcup')]: NOT_READY_COMPOSE })
    const report = await runDoctor(executor, 'grandslamcup')

    expect(report.ready).toBe(false)
    const failedIds = report.checks.filter((c) => !c.passed).map((c) => c.id)
    expect(failedIds).toEqual(
      expect.arrayContaining(['no-container-name', 'no-ports', 'network-alias', 'deploy-tag-image', 'rollout-label'])
    )
    // healthcheck уже есть на этом приложении (сессия №53) — не должен фигурировать среди провалов
    expect(failedIds).not.toContain('healthcheck')
  })

  it('отсутствующий compose-файл даёт not-ready с диагностикой', async () => {
    const executor = memoryExecutor()
    const report = await runDoctor(executor, 'grandslamcup')

    expect(report.ready).toBe(false)
    expect(report.checks).toEqual([expect.objectContaining({ id: 'compose-exists', passed: false })])
  })

  it('невалидный YAML даёт not-ready с диагностикой парсинга', async () => {
    // tab-символ в отступе — запрещён спецификацией YAML, парсер бросает YAMLParseError
    const executor = memoryExecutor({ [composePathForApp('grandslamcup')]: 'services:\n\tapp:\n\t\timage: x\n' })
    const report = await runDoctor(executor, 'grandslamcup')

    expect(report.ready).toBe(false)
    expect(report.checks[0]?.id).toBe('compose-parses')
  })

  it("отсутствующий сервис 'app' даёт not-ready с диагностикой", async () => {
    const executor = memoryExecutor({ [composePathForApp('grandslamcup')]: 'services:\n  db:\n    image: postgres\n' })
    const report = await runDoctor(executor, 'grandslamcup')

    expect(report.ready).toBe(false)
    expect(report.checks).toEqual([expect.objectContaining({ id: 'service-app-exists', passed: false })])
  })

  it('info-проверка (stop_grace_period) не блокирует готовность', async () => {
    const withoutGrace = READY_COMPOSE.replace('    stop_grace_period: 30s\n', '')
    const executor = memoryExecutor({ [composePathForApp('grandslamcup')]: withoutGrace })
    const report = await runDoctor(executor, 'grandslamcup')

    expect(report.ready).toBe(true)
    const graceCheck = report.checks.find((c) => c.id === 'stop-grace-period')
    expect(graceCheck).toEqual(expect.objectContaining({ passed: false, severity: 'info' }))
  })
})
