import { describe, expect, it } from 'vitest'
import { composePathForApp } from './doctor.js'
import type { CommandResult, DeployEngineExecutor } from './executor.js'
import { runRollout } from './rollout.js'

const READY_COMPOSE = `
services:
  app:
    image: time:\${DEPLOY_TAG:-latest}
    restart: unless-stopped
    healthcheck:
      test: ['CMD-SHELL', 'wget -q --spider http://0.0.0.0:3013/ || exit 1']
      interval: 5s
      timeout: 3s
      retries: 30
    stop_grace_period: 30s
    labels:
      letar.rollout: 'true'
    networks:
      premium-network:
        aliases:
          - time-app
`

interface CommandCall {
  command: string
  args: string[]
  cwd?: string
}

/**
 * In-memory executor с настраиваемыми ответами команд по префиксу argv (например
 * `['inspect', ...]` → healthy) и журналом вызовов для проверки последовательности шагов.
 */
function memoryExecutor(opts: {
  composeText?: string
  commandResults?: Array<{ match: (args: string[]) => boolean; result: CommandResult }>
}): { executor: DeployEngineExecutor; calls: CommandCall[] } {
  const calls: CommandCall[] = []
  const files = new Map<string, string>()
  if (opts.composeText) {
    files.set(composePathForApp('time'), opts.composeText)
  }
  const executor: DeployEngineExecutor = {
    async runCommand(command, args, execOpts) {
      calls.push({ command, args, cwd: execOpts?.cwd })
      const found = opts.commandResults?.find((r) => r.match(args))
      return found?.result ?? { stdout: '', stderr: '', exitCode: 0 }
    },
    async readFile(path) {
      return files.has(path) ? files.get(path)! : null
    },
    async writeFile(path, content) {
      files.set(path, content)
    },
    async fileExists(path) {
      return files.has(path)
    },
  }
  return { executor, calls }
}

const noopSleep = () => Promise.resolve()

describe('runRollout', () => {
  it('отказывается работать без пройденного doctor', async () => {
    const { executor, calls } = memoryExecutor({ composeText: undefined })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(false)
    expect(result.steps).toEqual([expect.objectContaining({ id: 'doctor', ok: false })])
    // ни одна docker-команда не должна была выполниться
    expect(calls).toHaveLength(0)
  })

  it('успешный прогон выполняет полную последовательность шагов в правильном порядке', async () => {
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        { match: (a) => a[0] === 'ps', result: { stdout: 'time-app-1\n', stderr: '', exitCode: 0 } },
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
      ],
    })

    const result = await runRollout(
      executor,
      'time',
      { npmContainerName: 'nginx-proxy-manager', deployTag: 'abc1234' },
      noopSleep,
    )

    expect(result.ok).toBe(true)
    expect(result.steps.map((s) => s.id)).toEqual([
      'doctor',
      'resolve-old-container',
      'scale-up',
      'wait-healthy',
      'nginx-reload-1',
      'stop-old',
      'rm-old',
      'nginx-reload-2',
    ])
    expect(result.steps.every((s) => s.ok)).toBe(true)

    // scale=2 с новым контейнером time-app-2, из директории apps/time
    const scaleCall = calls.find((c) => c.args.includes('--scale'))
    expect(scaleCall).toEqual(
      expect.objectContaining({
        command: 'docker',
        args: expect.arrayContaining(['compose', 'up', '-d', '--no-recreate', '--scale', 'app=2']),
        cwd: 'apps/time',
      }),
    )

    // healthcheck опрашивает именно новый контейнер (index 2, старый остаётся нетронутым)
    const inspectCall = calls.find((c) => c.args[0] === 'inspect')
    expect(inspectCall?.args).toContain('time-app-2')

    // старый (index 1) останавливается и удаляется, не новый
    expect(calls.find((c) => c.args[0] === 'stop')?.args).toContain('time-app-1')
    expect(calls.find((c) => c.args[0] === 'rm')?.args).toContain('time-app-1')

    // nginx reload — дважды, в контейнер NPM
    const reloads = calls.filter((c) => c.command === 'docker' && c.args[0] === 'exec')
    expect(reloads).toHaveLength(2)
    for (const call of reloads) {
      expect(call.args).toEqual(['exec', 'nginx-proxy-manager', 'nginx', '-s', 'reload'])
    }
  })

  it('останавливается на scale-up при ошибке docker compose', async () => {
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        { match: (a) => a[0] === 'ps', result: { stdout: 'time-app-1\n', stderr: '', exitCode: 0 } },
        { match: (a) => a.includes('--scale'), result: { stdout: '', stderr: 'boom', exitCode: 1 } },
      ],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(false)
    expect(result.steps.map((s) => s.id)).toEqual(['doctor', 'resolve-old-container', 'scale-up'])
    // после провала scale-up не должно быть попыток healthcheck/reload/stop/rm
    expect(calls.filter((c) => c.args[0] === 'inspect' || c.args[0] === 'exec' || c.args[0] === 'stop')).toHaveLength(
      0,
    )
  })

  it('таймаутит и останавливается, если новый контейнер не становится healthy', async () => {
    // noopSleep резолвится мгновенно, поэтому опрос крутится в реальном времени до
    // превышения healthTimeoutMs — fake timers тут не нужны (и ломают Date.now() внутри цикла).
    const { executor } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        { match: (a) => a[0] === 'ps', result: { stdout: 'time-app-1\n', stderr: '', exitCode: 0 } },
        { match: (a) => a[0] === 'inspect', result: { stdout: 'starting\n', stderr: '', exitCode: 0 } },
      ],
    })

    const result = await runRollout(
      executor,
      'time',
      { npmContainerName: 'nginx-proxy-manager', healthTimeoutMs: 10, pollIntervalMs: 1 },
      noopSleep,
    )

    expect(result.ok).toBe(false)
    expect(result.steps.map((s) => s.id)).toEqual(['doctor', 'resolve-old-container', 'scale-up', 'wait-healthy'])
    expect(result.steps.at(-1)?.detail).toContain('таймаут')
  })

  it('останавливается на nginx-reload-1, не трогая старый контейнер', async () => {
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        { match: (a) => a[0] === 'ps', result: { stdout: 'time-app-1\n', stderr: '', exitCode: 0 } },
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
        { match: (a) => a[0] === 'exec', result: { stdout: '', stderr: 'reload failed', exitCode: 1 } },
      ],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(false)
    expect(result.steps.map((s) => s.id)).toEqual([
      'doctor',
      'resolve-old-container',
      'scale-up',
      'wait-healthy',
      'nginx-reload-1',
    ])
    expect(calls.some((c) => c.args[0] === 'stop')).toBe(false)
  })

  it('резолвит legacy-имя старого контейнера (без суффикса -N) по compose-лейблам', async () => {
    // Контейнер создан ещё до перехода на rollout-профиль — явный container_name без суффикса.
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        { match: (a) => a[0] === 'ps', result: { stdout: 'time-app\n', stderr: '', exitCode: 0 } },
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
      ],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(true)
    expect(calls.find((c) => c.args[0] === 'stop')?.args).toContain('time-app')
    expect(calls.find((c) => c.args[0] === 'rm')?.args).toContain('time-app')
    // новый контейнер (по конвенции scale) не путается со старым (legacy-имя)
    expect(calls.find((c) => c.args[0] === 'inspect')?.args).toContain('time-app-2')
  })

  it('падает на resolve-old-container, если найдено 0 или >1 контейнеров сервиса app', async () => {
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        { match: (a) => a[0] === 'ps', result: { stdout: 'time-app-1\ntime-app-2\n', stderr: '', exitCode: 0 } },
      ],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(false)
    expect(result.steps.map((s) => s.id)).toEqual(['doctor', 'resolve-old-container'])
    expect(result.steps.at(-1)?.detail).toContain('найдено 2')
    // scale-up не должен был выполниться — небезопасно катить, не зная какой контейнер старый
    expect(calls.some((c) => c.args.includes('--scale'))).toBe(false)
  })
})
