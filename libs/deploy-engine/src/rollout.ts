/**
 * `rollout` — docker-rollout-паттерн (§18.6 сессия G): scale=2 → wait healthy нового
 * контейнера → nginx reload (NPM резолвит оба IP alias'а `<app>-app`, `proxy_next_upstream`
 * прикрывает окно) → graceful stop+rm старого → повторный reload.
 *
 * Имена контейнеров опираются на детерминированную нумерацию `docker compose --scale`:
 * `<project>-app-1` — единственная существующая реплика (index всегда 1 при scale=1),
 * `<project>-app-2` — новая, создаётся `--scale app=2 --no-recreate` (старая не трогается).
 *
 * Отказывается работать без пройденного `doctor` — нет смысла катить контейнер, который не
 * пройдёт healthcheck/alias-проверки (compose ещё не мигрирован на rollout-профиль).
 */

import { posix } from 'node:path'
import { composePathForApp, runDoctor } from './doctor.js'
import type { DeployEngineExecutor } from './executor.js'

export interface RolloutOptions {
  /** Имя compose-проекта (по умолчанию = app). Определяет имена контейнеров `<project>-app-N`. */
  projectName?: string
  /** Файл env для `docker compose --env-file` (по умолчанию `.env.docker`). */
  envFile?: string
  /** Тег образа — прокидывается через `DEPLOY_TAG` (compose: `image: <app>:${DEPLOY_TAG:-latest}`). */
  deployTag?: string
  /** Имя контейнера NPM для `nginx -s reload` (канон — `nginx-proxy-manager`, см. infra/nginx-proxy-manager). */
  npmContainerName: string
  /** Сколько ждать healthy у нового контейнера, мс (по умолчанию 5 минут). */
  healthTimeoutMs?: number
  /** Интервал опроса healthcheck, мс (по умолчанию 3с). */
  pollIntervalMs?: number
}

export interface RolloutStep {
  id: string
  description: string
  ok: boolean
  detail?: string
}

export interface RolloutResult {
  app: string
  ok: boolean
  /** Останавливается на первом провалившемся шаге — дальнейшие не выполняются. */
  steps: RolloutStep[]
}

const DEFAULT_HEALTH_TIMEOUT_MS = 5 * 60 * 1000
const DEFAULT_POLL_INTERVAL_MS = 3000
const DEFAULT_ENV_FILE = '.env.docker'

/** Директория compose-файла — производная от `composePathForApp` (единый источник конвенции пути). */
function composeDir(app: string): string {
  return posix.dirname(composePathForApp(app))
}

async function waitHealthy(
  executor: DeployEngineExecutor,
  containerName: string,
  timeoutMs: number,
  pollIntervalMs: number,
  sleep: (ms: number) => Promise<void>,
): Promise<{ ok: boolean; detail?: string }> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const res = await executor.runCommand('docker', [
      'inspect',
      '--format',
      '{{.State.Health.Status}}',
      containerName,
    ])
    const status = res.stdout.trim()
    if (status === 'healthy') {
      return { ok: true }
    }
    if (Date.now() >= deadline) {
      return {
        ok: false,
        detail: `таймаут ожидания healthy (последний статус: ${status || res.stderr.trim() || 'нет данных'})`,
      }
    }
    await sleep(pollIntervalMs)
  }
}

/** Прогоняет docker-rollout приложения. Останавливается на первом неуспешном шаге. */
export async function runRollout(
  executor: DeployEngineExecutor,
  app: string,
  options: RolloutOptions,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<RolloutResult> {
  const steps: RolloutStep[] = []
  const projectName = options.projectName ?? app
  const envFile = options.envFile ?? DEFAULT_ENV_FILE
  const dir = composeDir(app)
  const oldContainer = `${projectName}-app-1`
  const newContainer = `${projectName}-app-2`

  const doctor = await runDoctor(executor, app)
  const failedRequired = doctor.checks.filter((c) => !c.passed && c.severity === 'required').map((c) => c.id)
  steps.push({
    id: 'doctor',
    description: 'doctor подтверждает готовность compose к rollout',
    ok: doctor.ready,
    detail: doctor.ready ? undefined : `не пройдены: ${failedRequired.join(', ')}`,
  })
  if (!doctor.ready) {
    return { app, ok: false, steps }
  }

  const scaleUpEnv = options.deployTag ? { DEPLOY_TAG: options.deployTag } : undefined
  const scaleUp = await executor.runCommand(
    'docker',
    [
      'compose',
      '-f',
      'docker-compose.production.yml',
      '--env-file',
      envFile,
      'up',
      '-d',
      '--no-recreate',
      '--scale',
      'app=2',
      'app',
    ],
    { cwd: dir, env: scaleUpEnv },
  )
  steps.push({
    id: 'scale-up',
    description: `scale app=2 (новый контейнер ${newContainer})`,
    ok: scaleUp.exitCode === 0,
    detail: scaleUp.exitCode === 0 ? undefined : scaleUp.stderr.trim(),
  })
  if (scaleUp.exitCode !== 0) {
    return { app, ok: false, steps }
  }

  const health = await waitHealthy(
    executor,
    newContainer,
    options.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS,
    options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    sleep,
  )
  steps.push({
    id: 'wait-healthy',
    description: `${newContainer} стал healthy`,
    ok: health.ok,
    detail: health.detail,
  })
  if (!health.ok) {
    return { app, ok: false, steps }
  }

  const reload1 = await executor.runCommand('docker', ['exec', options.npmContainerName, 'nginx', '-s', 'reload'])
  steps.push({
    id: 'nginx-reload-1',
    description: 'nginx reload (резолвит alias на оба контейнера)',
    ok: reload1.exitCode === 0,
    detail: reload1.exitCode === 0 ? undefined : reload1.stderr.trim(),
  })
  if (reload1.exitCode !== 0) {
    return { app, ok: false, steps }
  }

  const stopOld = await executor.runCommand('docker', ['stop', oldContainer])
  steps.push({
    id: 'stop-old',
    description: `остановлен старый контейнер ${oldContainer}`,
    ok: stopOld.exitCode === 0,
    detail: stopOld.exitCode === 0 ? undefined : stopOld.stderr.trim(),
  })
  if (stopOld.exitCode !== 0) {
    return { app, ok: false, steps }
  }

  const rmOld = await executor.runCommand('docker', ['rm', oldContainer])
  steps.push({
    id: 'rm-old',
    description: `удалён старый контейнер ${oldContainer}`,
    ok: rmOld.exitCode === 0,
    detail: rmOld.exitCode === 0 ? undefined : rmOld.stderr.trim(),
  })
  if (rmOld.exitCode !== 0) {
    return { app, ok: false, steps }
  }

  const reload2 = await executor.runCommand('docker', ['exec', options.npmContainerName, 'nginx', '-s', 'reload'])
  steps.push({
    id: 'nginx-reload-2',
    description: 'повторный nginx reload (убирает старый IP из upstream)',
    ok: reload2.exitCode === 0,
    detail: reload2.exitCode === 0 ? undefined : reload2.stderr.trim(),
  })

  return { app, ok: steps.every((s) => s.ok), steps }
}
