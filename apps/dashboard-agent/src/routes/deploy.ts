/**
 * Deploy API Routes
 * API для деплоя на удалённых серверах
 * Поддерживает: pull images, restart containers, deploy-affected.sh
 *
 * Деплой приложений (POST /api/deploy/app) — асинхронная long-running операция:
 * возвращает deployId сразу, прогресс опрашивается через GET /api/deploy/status.
 * История последних деплоев хранится в ring-buffer в памяти процесса
 * (lib/deploy-history.ts, персистентность — lib/deploy-history-redis.ts),
 * жизненный цикл long-running процесса — lib/deploy-process.ts.
 */

import { spawn } from 'child_process'
import type { FastifyInstance } from 'fastify'
import {
  appendOutput,
  createDeploy,
  deployEvents,
  deployHistory,
  type DeployStatus,
  finishDeploy,
  getLatestDeploy,
  isDeployRunning,
  rehydrateHistory,
} from '../lib/deploy-history'
import { flushPersist } from '../lib/deploy-history-redis'
import { computeStalled } from '../lib/deploy-phases'
import {
  attachDeployProcessHandlers,
  getCurrentProcess,
  runDockerCommand,
  setCurrentProcess,
} from '../lib/deploy-process'
import { hostExecArgs } from '../lib/host-exec'
import { getHostLock, releaseHostLock, tryAcquireHostLock } from '../lib/host-lock'
import { getCurrentServer } from '../lib/server-config'
import { withTimeout } from '../lib/with-timeout'
import type { ApiResponse } from '../types'

// Максимум секунд на один long-poll запрос /api/deploy/wait — ограничение сверху
// (не только договорённость, но и Fastify/nginx-таймауты на туннеле), см. PLAN-INFRA.md §38 Этап 2.
const MAX_WAIT_SECONDS = 120
const DEFAULT_WAIT_SECONDS = 60

// Сколько хвостовых строк лога отдавать из /api/deploy/wait — в happy-path вызывающий
// ждёт смены фазы, а не читает лог целиком (см. §38 «Чего делать НЕ надо»).
const WAIT_LOG_TAIL_LINES = 20

export async function deployRoutes(fastify: FastifyInstance): Promise<void> {
  // ⚠️ Граница по времени обязательна, и вот почему (инцидент 2026-08-08, s3).
  //
  // Здесь стоял голый `await rehydrateFromRedis()`. Когда Redis по `REDIS_URL` недоступен,
  // команда НЕ падает: ioredis держит `enableOfflineQueue: true` и складывает её в очередь до
  // успешного подключения, а `retryStrategy` в `@letar/redis-client` переподключается бесконечно.
  // То есть `await` не завершался никогда — и Fastify убивал плагин по своему 10-секундному
  // таймауту (`AVV_ERR_PLUGIN_EXEC_TIMEOUT`), агент уходил в crash loop.
  //
  // Форма отказа тут важнее самого отказа: не «работаем без Redis», как обещает библиотека, а
  // смерть всего приложения. `try/catch` внутри rehydrateHistory не помогает — исключения
  // не происходит вовсе, происходит зависание.
  //
  // История деплоев — вещь необязательная (это кеш в памяти, восстанавливаемый из Redis), поэтому
  // 3 секунды и продолжаем без неё. Терять её неприятно, не подняться — недопустимо.
  await withTimeout(rehydrateHistory(), {
    ms: 3000,
    fallback: undefined,
    label: 'восстановление истории деплоев из Redis',
  })

  /**
   * GET /api/deploy/status — статус деплоя
   * Query:
   *   deployId  — конкретный деплой из истории (без него — текущий/последний)
   *   sinceLine — курсор: вернуть только строки лога начиная с этого номера
   *               (номер сквозной с учётом truncatedLines)
   */
  fastify.get<{ Querystring: { deployId?: string; sinceLine?: string } }>(
    '/api/deploy/status',
    async (
      request,
    ): Promise<
      ApiResponse<
        Omit<DeployStatus, 'output'> & {
          output: string[]
          totalLines: number
          fromLine: number
          stalled: boolean
          stalledSince?: string
        }
      >
    > => {
      const { deployId, sinceLine } = request.query

      const deploy = deployId ? deployHistory.find((d) => d.deployId === deployId) : getLatestDeploy()

      if (!deploy) {
        return {
          success: false,
          error: deployId ? `Deploy ${deployId} not found in history` : 'No deploys yet',
          timestamp: new Date().toISOString(),
        }
      }

      // Сквозная нумерация строк: строка N лога = output[N - truncatedLines]
      const totalLines = deploy.truncatedLines + deploy.output.length
      const since = sinceLine !== undefined ? Math.max(0, parseInt(sinceLine, 10) || 0) : 0
      const startIdx = Math.max(0, since - deploy.truncatedLines)
      const output = deploy.output.slice(startIdx)
      const fromLine = deploy.truncatedLines + startIdx
      const { stalled, stalledSince } = computeStalled(deploy)

      return {
        success: true,
        data: { ...deploy, output, totalLines, fromLine, stalled, stalledSince },
        timestamp: new Date().toISOString(),
      }
    },
  )

  /**
   * GET /api/deploy/wait — long-poll ожидание прогресса (PLAN-INFRA.md §38 Этап 2).
   * Query:
   *   deployId    — конкретный деплой из истории (без него — текущий/последний)
   *   waitSeconds — сколько максимум ждать (капится MAX_WAIT_SECONDS сверху — ограничение
   *                 Fastify/nginx-таймаутов на туннеле, не только договорённость)
   *
   * Отпускает раньше waitSeconds при: терминальном статусе, смене фазы (появилась новая
   * фаза) или смене признака залипания. В остальном — тот же снапшот, что /api/deploy/status,
   * но output — только хвост (WAIT_LOG_TAIL_LINES), а не полный курсорный лог: в happy-path
   * вызывающий ждёт СОБЫТИЯ, а не читает лог целиком (§38 «Чего делать НЕ надо»).
   */
  fastify.get<{ Querystring: { deployId?: string; waitSeconds?: string } }>(
    '/api/deploy/wait',
    async (
      request,
    ): Promise<
      ApiResponse<
        Omit<DeployStatus, 'output'> & {
          output: string[]
          totalLines: number
          stalled: boolean
          stalledSince?: string
        }
      >
    > => {
      const { deployId, waitSeconds } = request.query

      const deploy = deployId ? deployHistory.find((d) => d.deployId === deployId) : getLatestDeploy()

      if (!deploy) {
        return {
          success: false,
          error: deployId ? `Deploy ${deployId} not found in history` : 'No deploys yet',
          timestamp: new Date().toISOString(),
        }
      }

      const waitMs = Math.min(
        Math.max(1, parseInt(waitSeconds ?? String(DEFAULT_WAIT_SECONDS), 10) || DEFAULT_WAIT_SECONDS),
        MAX_WAIT_SECONDS,
      ) * 1000

      if (deploy.running) {
        const phasesAtStart = deploy.phases.length
        const stalledAtStart = computeStalled(deploy).stalled
        await new Promise<void>((resolve) => {
          let settled = false
          const finish = (): void => {
            if (settled) {
              return
            }
            settled = true
            clearTimeout(timer)
            deployEvents.off(deploy.deployId, onEvent)
            resolve()
          }
          const onEvent = (): void => {
            if (!deploy.running || deploy.phases.length !== phasesAtStart) {
              finish()
              return
            }
            if (computeStalled(deploy).stalled !== stalledAtStart) {
              finish()
            }
          }
          const timer = setTimeout(finish, waitMs)
          deployEvents.on(deploy.deployId, onEvent)
        })
      }

      const totalLines = deploy.truncatedLines + deploy.output.length
      const output = deploy.output.slice(-WAIT_LOG_TAIL_LINES)
      const { stalled, stalledSince } = computeStalled(deploy)

      return {
        success: true,
        data: { ...deploy, output, totalLines, stalled, stalledSince },
        timestamp: new Date().toISOString(),
      }
    },
  )

  /**
   * GET /api/deploy/history — краткая история последних деплоев (без логов)
   */
  fastify.get(
    '/api/deploy/history',
    async (): Promise<ApiResponse<Array<Omit<DeployStatus, 'output' | 'truncatedLines'>>>> => {
      return {
        success: true,
        data: deployHistory.map(({ output: _output, truncatedLines: _t, ...rest }) => rest).reverse(),
        timestamp: new Date().toISOString(),
      }
    },
  )

  /**
   * POST /api/deploy/pull — pull Docker image
   */
  fastify.post<{ Body: { image: string } }>(
    '/api/deploy/pull',
    async (request): Promise<ApiResponse<{ deployId: string; image: string; output: string }>> => {
      const { image } = request.body

      if (!image) {
        return {
          success: false,
          error: 'Image name is required',
          timestamp: new Date().toISOString(),
        }
      }

      const deploy = createDeploy({
        running: true,
        action: 'pull',
        startTime: new Date().toISOString(),
      })
      appendOutput(deploy, `Pulling image: ${image}`)

      try {
        const { stdout, stderr } = await runDockerCommand(`docker pull ${image}`)

        appendOutput(deploy, stdout || stderr || 'Pull completed')
        finishDeploy(deploy)

        return {
          success: true,
          data: {
            deployId: deploy.deployId,
            image,
            output: stdout || stderr,
          },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        finishDeploy(deploy, error)

        return {
          success: false,
          error: deploy.error,
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * POST /api/deploy/restart — restart container with latest image
   */
  fastify.post<{ Body: { containerId: string; pull?: boolean } }>(
    '/api/deploy/restart',
    async (request): Promise<ApiResponse<{ deployId: string; containerId: string; output: string[] }>> => {
      const { containerId, pull = false } = request.body

      if (!containerId) {
        return {
          success: false,
          error: 'Container ID is required',
          timestamp: new Date().toISOString(),
        }
      }

      const deploy = createDeploy({
        running: true,
        containerId,
        action: pull ? 'pull-restart' : 'restart',
        startTime: new Date().toISOString(),
      })

      const output: string[] = []

      try {
        // Получаем информацию о контейнере
        const { stdout: inspectOutput } = await runDockerCommand(
          `docker inspect ${containerId} --format '{{.Config.Image}}'`,
        )
        const imageName = inspectOutput.trim()
        output.push(`Container image: ${imageName}`)
        appendOutput(deploy, `Container image: ${imageName}`)

        // Pull если нужно
        if (pull && imageName) {
          output.push(`Pulling latest image: ${imageName}`)
          appendOutput(deploy, `Pulling latest image: ${imageName}`)

          const { stdout: pullOutput } = await runDockerCommand(`docker pull ${imageName}`)
          output.push(pullOutput || 'Pull completed')
          appendOutput(deploy, pullOutput || 'Pull completed')
        }

        // Restart контейнера
        output.push(`Restarting container: ${containerId}`)
        appendOutput(deploy, `Restarting container: ${containerId}`)

        await runDockerCommand(`docker restart ${containerId}`)
        output.push('Container restarted successfully')
        appendOutput(deploy, 'Container restarted successfully')

        finishDeploy(deploy)

        return {
          success: true,
          data: {
            deployId: deploy.deployId,
            containerId,
            output,
          },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        finishDeploy(deploy, error)

        return {
          success: false,
          error: deploy.error,
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * POST /api/deploy/compose-up — docker compose up для stack
   */
  fastify.post<{ Body: { composePath: string; services?: string[] } }>(
    '/api/deploy/compose-up',
    async (request): Promise<ApiResponse<{ deployId: string; output: string }>> => {
      const { composePath, services = [] } = request.body

      if (!composePath) {
        return {
          success: false,
          error: 'Compose file path is required',
          timestamp: new Date().toISOString(),
        }
      }

      const deploy = createDeploy({
        running: true,
        action: 'pull-restart',
        startTime: new Date().toISOString(),
      })
      appendOutput(deploy, `Running docker compose up for: ${composePath}`)

      try {
        const servicesArg = services.length > 0 ? services.join(' ') : ''
        const command = `docker compose -f ${composePath} up -d --pull always ${servicesArg}`

        appendOutput(deploy, `Command: ${command}`)

        const { stdout, stderr } = await runDockerCommand(command)
        const output = stdout || stderr || 'Compose up completed'

        appendOutput(deploy, output)
        finishDeploy(deploy)

        return {
          success: true,
          data: { deployId: deploy.deployId, output },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        finishDeploy(deploy, error)

        return {
          success: false,
          error: deploy.error,
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * POST /api/deploy/app — полный деплой приложения через deploy-affected.sh
   * Body: { appName: string; staging?: boolean; seed?: boolean }
   * staging: true → deploy-affected.sh --staging (образ <app>:staging, для s3)
   * seed: true → deploy-affected.sh --seed (nx run <app>:db:seed после успешного деплоя)
   *
   * Асинхронный: сразу возвращает deployId, клиент опрашивает /api/deploy/status.
   * Аргументы передаются spawn'у массивом — без промежуточного bash -c,
   * инъекция через body структурно невозможна.
   */
  fastify.post<{ Body: { appName: string; staging?: boolean; seed?: boolean } }>(
    '/api/deploy/app',
    async (
      request,
    ): Promise<
      ApiResponse<{ deployId: string; appName: string; staging: boolean; seed: boolean; started: boolean }>
    > => {
      const REPO_PATH = process.env.REPO_PATH || '/home/deploy/letar'

      const { appName, staging = false, seed = false } = request.body

      if (!appName) {
        return {
          success: false,
          error: 'App name is required',
          timestamp: new Date().toISOString(),
        }
      }

      // Валидация имени приложения (только буквы, цифры, дефис)
      if (!/^[a-z0-9-]+$/.test(appName)) {
        return {
          success: false,
          error: 'Invalid app name format',
          timestamp: new Date().toISOString(),
        }
      }

      // Серверный guard: s3 (staging-раннер) принимает только staging-деплои, s2 (прод) —
      // только production. Не даёт случайно задеплоить прод на staging-раннер или staging-
      // мусор на прод, независимо от того, кто и как вызвал API (defence in depth поверх
      // клиентской проверки в deploy-mcp).
      const currentServer = getCurrentServer()
      if (currentServer === 's3' && !staging) {
        return {
          success: false,
          error: 's3 — staging-раннер, принимает только staging-деплои (staging: true)',
          timestamp: new Date().toISOString(),
        }
      }
      if (currentServer === 's2' && staging) {
        return {
          success: false,
          error: 's2 — production, staging-деплои идут на s3 (staging: true здесь запрещён)',
          timestamp: new Date().toISOString(),
        }
      }

      // Если уже есть запущенный деплой — отклоняем
      if (isDeployRunning()) {
        return {
          success: false,
          error: 'Another deploy is already in progress',
          timestamp: new Date().toISOString(),
        }
      }

      // Host-level lock (см. lib/host-lock.ts): деплой и e2e спавнят процессы на одном хосте
      // и конкурируют за node_modules/сборку — блокируем и когда занято именно e2e-прогоном.
      if (!tryAcquireHostLock('deploy', appName)) {
        const lock = getHostLock()
        return {
          success: false,
          error:
            `Хост занят другой операцией: ${lock?.kind} (${lock?.label}), с ${lock?.since} — дождитесь завершения перед новым деплоем`,
          timestamp: new Date().toISOString(),
        }
      }

      const deploy = createDeploy({
        running: true,
        appName,
        staging,
        action: 'deploy-app',
        startTime: new Date().toISOString(),
      })

      appendOutput(deploy, `🚀 Deploying app: ${appName}${staging ? ' (staging)' : ''}${seed ? ' [+seed]' : ''}`)

      // nsenter выполняет скрипт на хосте (pid: host + privileged), скрипт сам делает cd
      // в свою директорию (SCRIPT_DIR в deploy-affected.sh) — аргументы массивом, без shell.
      const scriptPath = `${REPO_PATH}/deploy-affected.sh`
      const command = [scriptPath, '--app', appName, ...(staging ? ['--staging'] : []), ...(seed ? ['--seed'] : [])]
      const args = hostExecArgs(command)
      appendOutput(deploy, `📋 Command: nsenter ${args.join(' ')}`)

      // SOPS_AGE_KEY_FILE обязателен для расшифровки .env.docker.enc внутри
      // deploy-affected.sh. nsenter наследует env спавна, но в env контейнера
      // dashboard-agent этой переменной нет — пробрасываем явно (host-путь ключа,
      // как при ручном SSH-запуске BlackCove). Переопределяется env-переменной.
      const sopsKeyFile = process.env['SOPS_AGE_KEY_FILE'] || '/home/deploy/.age/letar-key.txt'

      const proc = spawn('nsenter', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, SOPS_AGE_KEY_FILE: sopsKeyFile },
      })
      setCurrentProcess(proc)
      attachDeployProcessHandlers(deploy, proc)

      // Возвращаем сразу — клиент будет опрашивать статус через /api/deploy/status
      return {
        success: true,
        data: {
          deployId: deploy.deployId,
          appName,
          staging,
          seed,
          started: true,
        },
        timestamp: new Date().toISOString(),
      }
    },
  )

  /**
   * POST /api/deploy/infra — деплой инфраструктурного сервиса infra/<service> через
   * scripts/deploy-infra.sh (PLAN-INFRA.md §18.8.1). В отличие от /api/deploy/app:
   * нет staging/production выбора (сервис живёт на конкретном сервере), нет e2e-гейта
   * (инфра не гоняет e2e), нет серверного guard'а по staging — все guard'ы вокруг
   * app-деплоя специфичны для пары app+сервер, у infra-сервисов такой пары нет.
   * Body: { service: string }
   */
  fastify.post<{ Body: { service: string } }>(
    '/api/deploy/infra',
    async (request): Promise<ApiResponse<{ deployId: string; service: string; started: boolean }>> => {
      const REPO_PATH = process.env.REPO_PATH || '/home/deploy/letar'

      const { service } = request.body

      if (!service) {
        return {
          success: false,
          error: 'Service name is required',
          timestamp: new Date().toISOString(),
        }
      }

      if (!/^[a-z0-9-]+$/.test(service)) {
        return {
          success: false,
          error: 'Invalid service name format',
          timestamp: new Date().toISOString(),
        }
      }

      if (isDeployRunning()) {
        return {
          success: false,
          error: 'Another deploy is already in progress',
          timestamp: new Date().toISOString(),
        }
      }

      if (!tryAcquireHostLock('deploy', service)) {
        const lock = getHostLock()
        return {
          success: false,
          error:
            `Хост занят другой операцией: ${lock?.kind} (${lock?.label}), с ${lock?.since} — дождитесь завершения перед новым деплоем`,
          timestamp: new Date().toISOString(),
        }
      }

      const deploy = createDeploy({
        running: true,
        appName: service,
        action: 'deploy-infra',
        startTime: new Date().toISOString(),
      })

      appendOutput(deploy, `🚀 Deploying infra service: ${service}`)

      // Тот же nsenter-путь на хост, что и /api/deploy/app — scripts/deploy-infra.sh лежит
      // в корне репозитория рядом с deploy-affected.sh.
      const scriptPath = `${REPO_PATH}/scripts/deploy-infra.sh`
      const command = [scriptPath, service]
      const args = hostExecArgs(command)
      appendOutput(deploy, `📋 Command: nsenter ${args.join(' ')}`)

      // SOPS_AGE_KEY_FILE нужен, только если у сервиса есть secrets/deploy.conf — сам скрипт
      // это проверяет и падает с понятной ошибкой, если ключа нет, а секреты есть.
      const sopsKeyFile = process.env['SOPS_AGE_KEY_FILE'] || '/home/deploy/.age/letar-key.txt'

      const proc = spawn('nsenter', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, SOPS_AGE_KEY_FILE: sopsKeyFile },
      })
      setCurrentProcess(proc)
      attachDeployProcessHandlers(deploy, proc)

      return {
        success: true,
        data: {
          deployId: deploy.deployId,
          service,
          started: true,
        },
        timestamp: new Date().toISOString(),
      }
    },
  )

  /**
   * POST /api/deploy/cancel — отмена текущего деплоя
   */
  fastify.post('/api/deploy/cancel', async (): Promise<ApiResponse<{ deployId: string; cancelled: boolean }>> => {
    const running = deployHistory.find((d) => d.running)
    const proc = getCurrentProcess()

    if (!running || !proc) {
      return {
        success: false,
        error: 'No deploy in progress',
        timestamp: new Date().toISOString(),
      }
    }

    try {
      proc.kill('SIGTERM')
      appendOutput(running, '🛑 Deploy cancelled by user')
      running.error = 'Cancelled by user'
      running.running = false
      running.endTime = new Date().toISOString()
      setCurrentProcess(null)
      releaseHostLock()
      flushPersist(running)
      deployEvents.emit(running.deployId)

      return {
        success: true,
        data: { deployId: running.deployId, cancelled: true },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel',
        timestamp: new Date().toISOString(),
      }
    }
  })
}
