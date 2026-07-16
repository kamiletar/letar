/**
 * `rollout` — docker-rollout-паттерн (§18.6 сессия G): scale=2 → wait healthy нового
 * контейнера → smoke-test реальным HTTP-запросом → nginx reload (NPM резолвит оба IP alias'а
 * `<app>-app`, `proxy_next_upstream` прикрывает окно) → graceful stop+rm старого → повторный
 * reload.
 *
 * Имена контейнеров НЕ опираются на нумерацию `docker compose --scale` (она не детерминирована:
 * Compose выбирает следующий свободный индекс, а не всегда `-1`/`-2` — после нескольких
 * rollout-циклов старый контейнер может быть `-app-3`, новый — `-app-4`). Вместо этого оба имени
 * резолвятся через `docker ps --filter label=com.docker.compose...` — старое ДО scale-up (пока
 * существует ровно один контейнер сервиса app), новое ПОСЛЕ scale-up (вычитанием уже известного
 * старого имени из обновлённого списка).
 *
 * Отказывается работать без пройденного `doctor` — нет смысла катить контейнер, который не
 * пройдёт healthcheck/alias-проверки (compose ещё не мигрирован на rollout-профиль).
 */

import { posix } from 'node:path'
import { parseCompose, serviceHealthcheckUrl } from './compose.js'
import { composePathForApp, runDoctor } from './doctor.js'
import type { DeployEngineExecutor } from './executor.js'

export interface RolloutOptions {
  /** Имя compose-проекта (по умолчанию = app). Используется как лейбл-фильтр `docker ps` для
   *  резолва реальных имён контейнеров (см. `resolveOldContainer`/`resolveNewContainer`). */
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

/**
 * Список всех контейнеров сервиса `app` compose-проекта `projectName` — по compose-лейблам, не
 * по конвенции имени (легаси-контейнеры, созданные до перехода на rollout-профиль, могли иметь
 * явный `container_name` типа `time-app` без `-1` — та же категория бага, что чинили в dashboard,
 * `findContainerByName`, commit 8de3029). Общий примитив для резолва и старого, и нового
 * контейнера — разница только в том, до или после scale-up он вызывается и как парсится
 * результат.
 */
async function listAppContainers(executor: DeployEngineExecutor, projectName: string): Promise<string[]> {
  const res = await executor.runCommand('docker', [
    'ps',
    '-a',
    '--filter',
    `label=com.docker.compose.project=${projectName}`,
    '--filter',
    'label=com.docker.compose.service=app',
    '--format',
    '{{.Names}}',
  ])
  return res.stdout.split('\n').map((s) => s.trim()).filter(Boolean)
}

/** Резолвит имя единственного существующего контейнера сервиса `app` ДО scale-up (пока их ровно один). */
async function resolveOldContainer(
  executor: DeployEngineExecutor,
  projectName: string,
): Promise<{ name?: string; error?: string }> {
  const names = await listAppContainers(executor, projectName)
  if (names.length !== 1) {
    return {
      error: `ожидался ровно 1 существующий контейнер сервиса app, найдено ${names.length}${
        names.length > 0 ? `: ${names.join(', ')}` : ''
      }`,
    }
  }
  return { name: names[0] }
}

/**
 * Резолвит имя нового контейнера ПОСЛЕ scale-up — не по конвенции `<project>-app-2` (Compose
 * выбирает следующий свободный индекс, не гарантированно 2 — после нескольких rollout-циклов
 * старый контейнер мог остаться `-app-3`, тогда новый станет `-app-4`), а вычитанием уже
 * известного `oldContainer` из обновлённого списка `docker ps`.
 */
async function resolveNewContainer(
  executor: DeployEngineExecutor,
  projectName: string,
  oldContainer: string,
): Promise<{ name?: string; error?: string }> {
  const names = await listAppContainers(executor, projectName)
  const candidates = names.filter((n) => n !== oldContainer)
  if (candidates.length !== 1) {
    return {
      error: `ожидался ровно 1 новый контейнер сервиса app (кроме ${oldContainer}), найдено ${candidates.length}${
        candidates.length > 0 ? `: ${candidates.join(', ')}` : ''
      }`,
    }
  }
  return { name: candidates[0] }
}

/**
 * Реальный HTTP-запрос к новому контейнеру (не только TCP/`wget --spider`, который Docker
 * healthcheck использует и который не всегда ловит 5xx — busybox wget в режиме `--spider`
 * иногда засчитывает сам факт соединения, не статус ответа). Найдено при инциденте mandala
 * (сессия №70, §18.6): контейнер был "healthy" по Docker, но каждая страница отдавала 500
 * (sharp/libvips). `wget` без `--spider` возвращает ненулевой exit code на реальный 4xx/5xx.
 *
 * Если URL healthcheck не удаётся извлечь из compose — не блокирует rollout (defense-in-depth,
 * не новая точка отказа): doctor уже требует healthcheck как обязательную проверку, отсутствие
 * извлекаемого URL — редкий edge case формата, не повод останавливать уже работающий пайплайн.
 */
async function smokeTest(
  executor: DeployEngineExecutor,
  app: string,
  newContainer: string,
): Promise<{ ok: boolean; detail?: string }> {
  const composePath = composePathForApp(app)
  const raw = await executor.readFile(composePath)
  const service = raw ? parseCompose(raw).services?.['app'] : undefined
  const url = service ? serviceHealthcheckUrl(service) : undefined
  if (!url) {
    return { ok: true, detail: 'healthcheck URL не извлечён из compose — smoke-test пропущен' }
  }
  const res = await executor.runCommand('docker', ['exec', newContainer, 'wget', '-q', '-O', '/dev/null', url])
  if (res.exitCode !== 0) {
    return {
      ok: false,
      detail: `wget вернул ошибку на ${url} (вероятно не-2xx ответ): ${
        res.stderr.trim() || res.stdout.trim() || `exit ${res.exitCode}`
      }`,
    }
  }
  return { ok: true }
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

  // Резолвится ДО scale-up, пока существует ровно один контейнер сервиса app — само по себе
  // имя запоминается, чтобы после scale-up вычесть его из обновлённого списка и получить новый
  // (см. resolveNewContainer ниже).
  const resolved = await resolveOldContainer(executor, projectName)
  steps.push({
    id: 'resolve-old-container',
    description: 'найден единственный существующий контейнер сервиса app (кандидат на замену)',
    ok: resolved.name !== undefined,
    detail: resolved.error,
  })
  if (!resolved.name) {
    return { app, ok: false, steps }
  }
  const oldContainer = resolved.name

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
    description: 'scale app=2 (имя нового контейнера определит Docker Compose)',
    ok: scaleUp.exitCode === 0,
    detail: scaleUp.exitCode === 0 ? undefined : scaleUp.stderr.trim(),
  })
  if (scaleUp.exitCode !== 0) {
    return { app, ok: false, steps }
  }

  const resolvedNew = await resolveNewContainer(executor, projectName, oldContainer)
  steps.push({
    id: 'resolve-new-container',
    description: 'найден новый контейнер сервиса app, созданный scale-up',
    ok: resolvedNew.name !== undefined,
    detail: resolvedNew.error,
  })
  if (!resolvedNew.name) {
    return { app, ok: false, steps }
  }
  const newContainer = resolvedNew.name

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

  const smoke = await smokeTest(executor, app, newContainer)
  steps.push({
    id: 'smoke-test',
    description: `реальный HTTP-запрос к ${newContainer} возвращает не-5xx (не только TCP healthcheck)`,
    ok: smoke.ok,
    detail: smoke.detail,
  })
  if (!smoke.ok) {
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
