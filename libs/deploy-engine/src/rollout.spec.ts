import { describe, expect, it } from 'vitest'
import { composePathForApp } from './doctor.js'
import type { CommandResult, DeployEngineExecutor } from './executor.js'
import { detectProxyKind, runRollout } from './rollout.js'

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
      kami-network:
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
 *
 * `result` может быть статическим объектом или функцией `() => CommandResult` — функция нужна,
 * когда одна и та же команда (например `docker ps` с теми же аргументами) вызывается дважды за
 * прогон с разным реальным состоянием Docker (до и после scale-up) — см. `sequentialPsResults`.
 */
function memoryExecutor(opts: {
  composeText?: string
  commandResults?: Array<{ match: (args: string[]) => boolean; result: CommandResult | (() => CommandResult) }>
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
      if (!found) {
        return { stdout: '', stderr: '', exitCode: 0 }
      }
      return typeof found.result === 'function' ? found.result() : found.result
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

/**
 * Matcher для `docker ps`, возвращающий разные stdout на последовательные вызовы (первый — до
 * scale-up, второй — после). Последний `output` повторяется, если вызовов больше, чем элементов.
 */
function sequentialPsResults(...outputs: string[]): {
  match: (args: string[]) => boolean
  result: () => CommandResult
} {
  let call = 0
  return {
    match: (a) => a[0] === 'ps',
    result: () => {
      const stdout = outputs[Math.min(call, outputs.length - 1)]
      call += 1
      return { stdout, stderr: '', exitCode: 0 }
    },
  }
}

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
        sequentialPsResults('time-app-1\n', 'time-app-1\ntime-app-2\n'),
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
      'resolve-new-container',
      'wait-healthy',
      'smoke-test',
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

    // smoke-test дёргает URL из healthcheck.test у нового контейнера через node -e, не через wget
    // (гарантированно есть в любом Node-образе, в отличие от wget — см. комментарий над smokeTest)
    const smokeCall = calls.find((c) => c.args[0] === 'exec' && c.args.includes('node'))
    expect(smokeCall?.args).toEqual([
      'exec',
      'time-app-2',
      'node',
      '-e',
      expect.stringContaining('http://0.0.0.0:3013/'),
    ])

    // старый (index 1) останавливается и удаляется, не новый
    expect(calls.find((c) => c.args[0] === 'stop')?.args).toContain('time-app-1')
    expect(calls.find((c) => c.args[0] === 'rm')?.args).toContain('time-app-1')

    // nginx reload — дважды, в контейнер NPM (отдельно от smoke-test exec)
    const reloads = calls.filter((c) => c.command === 'docker' && c.args[0] === 'exec' && c.args.includes('nginx'))
    expect(reloads).toHaveLength(2)
    for (const call of reloads) {
      expect(call.args).toEqual(['exec', 'nginx-proxy-manager', 'nginx', '-s', 'reload'])
    }
  })

  it('onStep вызывается сразу после каждого шага, а не постфактум по завершении rollout', async () => {
    // Регрессия на инцидент auth-hub (§18.6 сессия K): без построчного onStep вызывающая сторона
    // (CLI/deploy-mcp) не видит прогресс до самого конца rollout — долгий wait-healthy выглядит
    // зависшим при live-опросе, хотя каждый шаг уже давно отработал.
    const { executor } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        sequentialPsResults('time-app-1\n', 'time-app-1\ntime-app-2\n'),
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
      ],
    })

    const seenSteps: string[] = []
    const result = await runRollout(
      executor,
      'time',
      { npmContainerName: 'nginx-proxy-manager' },
      noopSleep,
      (step) => seenSteps.push(step.id),
    )

    // onStep видел ровно те же шаги, в том же порядке, что и итоговый result.steps —
    // не накопленный постфактум список, а потоковая копия того же самого.
    expect(seenSteps).toEqual(result.steps.map((s) => s.id))
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
    expect(calls.filter((c) => c.args[0] === 'inspect' || c.args[0] === 'exec' || c.args[0] === 'stop')).toHaveLength(0)
  })

  it('таймаутит и останавливается, если новый контейнер не становится healthy', async () => {
    // noopSleep резолвится мгновенно, поэтому опрос крутится в реальном времени до
    // превышения healthTimeoutMs — fake timers тут не нужны (и ломают Date.now() внутри цикла).
    const { executor } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        sequentialPsResults('time-app-1\n', 'time-app-1\ntime-app-2\n'),
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
    expect(result.steps.map((s) => s.id)).toEqual([
      'doctor',
      'resolve-old-container',
      'scale-up',
      'resolve-new-container',
      'wait-healthy',
    ])
    expect(result.steps.at(-1)?.detail).toContain('таймаут')
  })

  it('останавливается на nginx-reload-1, не трогая старый контейнер', async () => {
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        sequentialPsResults('time-app-1\n', 'time-app-1\ntime-app-2\n'),
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
        {
          match: (a) => a[0] === 'exec' && a.includes('nginx'),
          result: { stdout: '', stderr: 'reload failed', exitCode: 1 },
        },
      ],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(false)
    expect(result.steps.map((s) => s.id)).toEqual([
      'doctor',
      'resolve-old-container',
      'scale-up',
      'resolve-new-container',
      'wait-healthy',
      'smoke-test',
      'nginx-reload-1',
    ])
    expect(calls.some((c) => c.args[0] === 'stop')).toBe(false)
  })

  it('останавливается на smoke-test, если новый контейнер отдаёт реальный 5xx (healthy по Docker, но не по содержимому)', async () => {
    // Инцидент mandala (сессия №70): контейнер "healthy" по TCP-healthcheck, но каждая страница 500.
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        sequentialPsResults('time-app-1\n', 'time-app-1\ntime-app-2\n'),
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
        {
          // node-скрипт сам решает по statusCode>=500 и выходит с exit 1 — никакого stderr от node,
          // в отличие от старого wget-подхода (см. комментарий над smokeTest в rollout.ts).
          match: (a) => a[0] === 'exec' && a.includes('node'),
          result: { stdout: '', stderr: '', exitCode: 1 },
        },
      ],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(false)
    expect(result.steps.map((s) => s.id)).toEqual([
      'doctor',
      'resolve-old-container',
      'scale-up',
      'resolve-new-container',
      'wait-healthy',
      'smoke-test',
    ])
    expect(result.steps.at(-1)?.detail).toContain('вернул 5xx или не удался')
    // ни nginx reload, ни stop/rm старого — старый контейнер продолжает обслуживать весь трафик
    expect(calls.some((c) => c.args[0] === 'exec' && c.args.includes('nginx'))).toBe(false)
    expect(calls.some((c) => c.args[0] === 'stop')).toBe(false)
  })

  it('пропускает smoke-test без блокировки, если URL healthcheck не извлекается из compose', async () => {
    const NO_URL_COMPOSE = `
services:
  app:
    image: time:\${DEPLOY_TAG:-latest}
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'node', 'healthcheck.js']
      interval: 5s
      timeout: 3s
      retries: 30
    stop_grace_period: 30s
    labels:
      letar.rollout: 'true'
    networks:
      kami-network:
        aliases:
          - time-app
`
    const { executor, calls } = memoryExecutor({
      composeText: NO_URL_COMPOSE,
      commandResults: [
        sequentialPsResults('time-app-1\n', 'time-app-1\ntime-app-2\n'),
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
      ],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(true)
    const smokeStep = result.steps.find((s) => s.id === 'smoke-test')
    expect(smokeStep?.ok).toBe(true)
    expect(smokeStep?.detail).toContain('пропущен')
    // без URL нечего дёргать через wget — не должно быть exec с wget в аргументах
    expect(calls.some((c) => c.args[0] === 'exec' && c.args.includes('wget'))).toBe(false)
  })

  it('smoke-test переключается на wget, если в образе нет node (статический экспорт на nginx:alpine)', async () => {
    // Инцидент pravda (2026-09-05): финальный слой Dockerfile.production на nginx:alpine —
    // `docker exec ... node -e ...` падает "executable file not found", хотя контейнер healthy.
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        sequentialPsResults('time-app-1\n', 'time-app-1\ntime-app-2\n'),
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
        {
          match: (a) => a[0] === 'exec' && a.includes('sh') && a.includes('command -v node'),
          result: { stdout: '', stderr: 'command -v node: not found\n', exitCode: 127 },
        },
        {
          match: (a) => a[0] === 'exec' && a.some((arg) => arg.includes('wget')),
          result: { stdout: '200\n', stderr: '', exitCode: 0 },
        },
      ],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(true)
    const smokeStep = result.steps.find((s) => s.id === 'smoke-test')
    expect(smokeStep?.ok).toBe(true)
    // node -e не вызывался — только проверка наличия node и wget-фолбэк
    expect(calls.some((c) => c.args[0] === 'exec' && c.args.includes('node') && c.args.includes('-e'))).toBe(false)
    expect(calls.some((c) => c.args[0] === 'exec' && c.args.some((arg) => arg.includes('wget')))).toBe(true)
  })

  it('smoke-test через wget-фолбэк ловит реальный 5xx так же, как node-путь', async () => {
    const { executor } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        sequentialPsResults('time-app-1\n', 'time-app-1\ntime-app-2\n'),
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
        {
          match: (a) => a[0] === 'exec' && a.includes('sh') && a.includes('command -v node'),
          result: { stdout: '', stderr: 'command -v node: not found\n', exitCode: 127 },
        },
        {
          match: (a) => a[0] === 'exec' && a.some((arg) => arg.includes('wget')),
          result: { stdout: '500\n', stderr: '', exitCode: 0 },
        },
      ],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(false)
    const smokeStep = result.steps.find((s) => s.id === 'smoke-test')
    expect(smokeStep?.ok).toBe(false)
    expect(smokeStep?.detail).toContain('wget-фолбэк')
  })

  it('резолвит legacy-имя старого контейнера (без суффикса -N) по compose-лейблам', async () => {
    // Контейнер создан ещё до перехода на rollout-профиль — явный container_name без суффикса.
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        sequentialPsResults('time-app\n', 'time-app\ntime-app-2\n'),
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
      ],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(true)
    expect(calls.find((c) => c.args[0] === 'stop')?.args).toContain('time-app')
    expect(calls.find((c) => c.args[0] === 'rm')?.args).toContain('time-app')
    // новый контейнер резолвится вычитанием legacy-имени старого из списка, не по конвенции
    expect(calls.find((c) => c.args[0] === 'inspect')?.args).toContain('time-app-2')
  })

  it(
    'резолвит новый контейнер по фактическому индексу Docker Compose, а не по хардкоду -app-2 '
      + '(инцидент auth-hub: старый контейнер уже -app-3, scale-up создаёт -app-4)',
    async () => {
      const { executor, calls } = memoryExecutor({
        composeText: READY_COMPOSE,
        commandResults: [
          sequentialPsResults('time-app-3\n', 'time-app-3\ntime-app-4\n'),
          { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
        ],
      })

      const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

      expect(result.ok).toBe(true)
      expect(result.steps.map((s) => s.id)).toContain('resolve-new-container')

      // healthcheck и smoke-test бьют в реальный новый контейнер (-app-4), не в хардкод -app-2
      expect(calls.find((c) => c.args[0] === 'inspect')?.args).toContain('time-app-4')
      expect(calls.find((c) => c.args[0] === 'exec' && c.args.includes('node'))?.args).toContain('time-app-4')

      // старый (-app-3) останавливается и удаляется, не новый
      expect(calls.find((c) => c.args[0] === 'stop')?.args).toContain('time-app-3')
      expect(calls.find((c) => c.args[0] === 'rm')?.args).toContain('time-app-3')
    },
  )

  it('падает на resolve-new-container, если scale-up не создал новый контейнер', async () => {
    // Post-scale ps возвращает только старый контейнер — scale-up формально ok, но реального
    // нового контейнера нет (например, race condition или сбой Docker без ненулевого exit code).
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [sequentialPsResults('time-app-1\n', 'time-app-1\n')],
    })

    const result = await runRollout(executor, 'time', { npmContainerName: 'nginx-proxy-manager' }, noopSleep)

    expect(result.ok).toBe(false)
    expect(result.steps.map((s) => s.id)).toEqual([
      'doctor',
      'resolve-old-container',
      'scale-up',
      'resolve-new-container',
    ])
    expect(result.steps.at(-1)?.detail).toContain('найдено 0')
    // ни healthcheck, ни nginx reload, ни stop/rm — небезопасно продолжать, не зная новый контейнер
    expect(calls.some((c) => c.args[0] === 'inspect' || c.args[0] === 'exec' || c.args[0] === 'stop')).toBe(false)
  })

  it('proxyKind: traefik пропускает nginx-reload как no-op, без docker exec к прокси', async () => {
    // §48 M3 шаг 4: Traefik docker-провайдер сам подхватывает/убирает контейнеры по событиям —
    // нет команды-аналога `nginx -s reload`, шаги остаются в RolloutResult.steps[] для видимости
    // прогресса, но ok:true без реального docker exec.
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        sequentialPsResults('time-app-1\n', 'time-app-1\ntime-app-2\n'),
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
      ],
    })

    const result = await runRollout(executor, 'time', { proxyKind: 'traefik' }, noopSleep)

    expect(result.ok).toBe(true)
    expect(result.steps.map((s) => s.id)).toEqual([
      'doctor',
      'resolve-old-container',
      'scale-up',
      'resolve-new-container',
      'wait-healthy',
      'smoke-test',
      'nginx-reload-1',
      'stop-old',
      'rm-old',
      'nginx-reload-2',
    ])
    expect(result.steps.every((s) => s.ok)).toBe(true)
    // ни одного docker exec с nginx — Traefik не получает явного сигнала
    expect(calls.some((c) => c.args[0] === 'exec' && c.args.includes('nginx'))).toBe(false)
    // старый контейнер всё равно останавливается и удаляется
    expect(calls.find((c) => c.args[0] === 'stop')?.args).toContain('time-app-1')
    expect(calls.find((c) => c.args[0] === 'rm')?.args).toContain('time-app-1')
  })

  it('proxyKind: npm без npmContainerName падает на nginx-reload-1 с понятной ошибкой', async () => {
    const { executor, calls } = memoryExecutor({
      composeText: READY_COMPOSE,
      commandResults: [
        sequentialPsResults('time-app-1\n', 'time-app-1\ntime-app-2\n'),
        { match: (a) => a[0] === 'inspect', result: { stdout: 'healthy\n', stderr: '', exitCode: 0 } },
      ],
    })

    const result = await runRollout(executor, 'time', {}, noopSleep)

    expect(result.ok).toBe(false)
    expect(result.steps.at(-1)).toEqual(
      expect.objectContaining({ id: 'nginx-reload-1', ok: false, detail: expect.stringContaining('npmContainerName') }),
    )
    expect(calls.some((c) => c.args[0] === 'stop')).toBe(false)
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

describe('detectProxyKind', () => {
  function psExecutor(namesStdout: string): DeployEngineExecutor {
    return {
      async runCommand(command, args) {
        if (command === 'docker' && args[0] === 'ps') {
          return { stdout: namesStdout, stderr: '', exitCode: 0 }
        }
        return { stdout: '', stderr: '', exitCode: 0 }
      },
      async readFile() {
        return null
      },
      async writeFile() {},
      async fileExists() {
        return false
      },
    }
  }

  it('находит nginx-proxy-manager (s2) среди запущенных контейнеров', async () => {
    const result = await detectProxyKind(psExecutor('dashboard-app-1\nnginx-proxy-manager\ntraefik\n'))
    // NPM в приоритете, если оба контейнера почему-то живы одновременно (переходный момент миграции)
    expect(result).toEqual({ proxyKind: 'npm', npmContainerName: 'nginx-proxy-manager' })
  })

  it('находит npm (легаси-имя контейнера на s3) среди запущенных контейнеров', async () => {
    const result = await detectProxyKind(psExecutor('dashboard-agent\nnpm\n'))
    expect(result).toEqual({ proxyKind: 'npm', npmContainerName: 'npm' })
  })

  it('находит traefik, если ни один из NPM-кандидатов не запущен', async () => {
    const result = await detectProxyKind(psExecutor('dashboard-app-1\ntraefik\n'))
    expect(result).toEqual({ proxyKind: 'traefik' })
  })

  it('откатывается на исторический дефолт npm/nginx-proxy-manager, если не найден ни один прокси', async () => {
    const result = await detectProxyKind(psExecutor('dashboard-app-1\n'))
    expect(result).toEqual({ proxyKind: 'npm', npmContainerName: 'nginx-proxy-manager' })
  })
})
