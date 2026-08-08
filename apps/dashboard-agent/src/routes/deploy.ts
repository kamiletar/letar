/**
 * Deploy API Routes
 * API для деплоя на удалённых серверах
 * Поддерживает: pull images, restart containers, deploy-affected.sh
 *
 * Деплой приложений (POST /api/deploy/app) — асинхронная long-running операция:
 * возвращает deployId сразу, прогресс опрашивается через GET /api/deploy/status.
 * История последних деплоев хранится в ring-buffer в памяти процесса.
 */

import { type ChildProcess, exec, spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import type { FastifyInstance } from 'fastify'
import { promisify } from 'util'
import { applyPhaseLine, computeStalled, type DeployPhase } from '../lib/deploy-phases'
import { hostExecArgs } from '../lib/host-exec'
import { getRedis } from '../lib/redis'
import { getCurrentServer } from '../lib/server-config'
import { withTimeout } from '../lib/with-timeout'
import type { ApiResponse } from '../types'

const execAsync = promisify(exec)

// Ограничения хранения: сколько деплоев помним и сколько строк лога на деплой
const MAX_DEPLOY_HISTORY = 20
const MAX_OUTPUT_LINES = 2000

// Максимум секунд на один long-poll запрос /api/deploy/wait — ограничение сверху
// (не только договорённость, но и Fastify/nginx-таймауты на туннеле), см. PLAN-INFRA.md §38 Этап 2.
const MAX_WAIT_SECONDS = 120
const DEFAULT_WAIT_SECONDS = 60

// Сколько хвостовых строк лога отдавать из /api/deploy/wait — в happy-path вызывающий
// ждёт смены фазы, а не читает лог целиком (см. §38 «Чего делать НЕ надо»).
const WAIT_LOG_TAIL_LINES = 20

// Статус одного деплоя
interface DeployStatus {
  deployId: string
  running: boolean
  appName?: string
  staging?: boolean
  containerId?: string
  action?: 'pull' | 'restart' | 'pull-restart' | 'deploy-app'
  startTime?: string
  endTime?: string
  exitCode?: number | null
  /** Полный лог (капится MAX_OUTPUT_LINES, при переполнении старые строки вытесняются) */
  output: string[]
  /** Сколько строк было вытеснено из начала output из-за переполнения */
  truncatedLines: number
  error?: string
  /** true если запись восстановлена из Redis после рестарта агента во время running=true — реальный
   * исход деплоя после этого момента неизвестен dashboard-agent'у (см. lib/redis.ts) */
  interrupted?: boolean
  /** Структурированный прогресс — распарсен из `::phase:name:start/ok/fail` маркеров
   * deploy-affected.sh и из уже существующих `[step-id]` строк libs/deploy-engine (rollout.ts)
   * при zero-downtime rollout. Не заменяет прозу в `output`, а дополняет её (PLAN-INFRA.md §38). */
  phases: DeployPhase[]
  /** ISO-время последней строки лога — основа watchdog'а залипания (computeStalled ниже) */
  lastOutputAt?: string
}

// Ring-buffer истории деплоев: новые в конец, старые вытесняются. Персистится в Redis
// (best-effort, см. persistDeploy/persistIndex ниже) — переживает рестарт контейнера.
const deployHistory: DeployStatus[] = []

// Текущий процесс деплоя (для возможности отмены)
let currentProcess: ChildProcess | null = null

// =============================================================================
// Redis-персистентность (best-effort, graceful degradation без Redis — см. lib/redis.ts)
// =============================================================================

const REDIS_KEY_PREFIX = 'dashboard-agent:deploy:'
const REDIS_INDEX_KEY = `${REDIS_KEY_PREFIX}index`
// TTL с запасом сверх разумного времени жизни записи — подстраховка от рассинхрона
// индекса и элементов, а не основной механизм ограничения размера (для этого MAX_DEPLOY_HISTORY)
const REDIS_ITEM_TTL_SEC = 7 * 24 * 60 * 60

function redisItemKey(deployId: string): string {
  return `${REDIS_KEY_PREFIX}item:${deployId}`
}

/** Немедленный best-effort персист снапшота одного деплоя */
async function persistDeploy(deploy: DeployStatus): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }
  try {
    await r.set(redisItemKey(deploy.deployId), JSON.stringify(deploy), 'EX', REDIS_ITEM_TTL_SEC)
  } catch {
    // Не критично — следующий персист (debounce/flush) попробует снова
  }
}

/** Перезаписывает индекс порядка deployId целиком (список короткий — до MAX_DEPLOY_HISTORY) */
async function persistIndex(): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }
  try {
    const ids = deployHistory.map((d) => d.deployId)
    const pipeline = r.pipeline()
    pipeline.del(REDIS_INDEX_KEY)
    if (ids.length > 0) {
      pipeline.rpush(REDIS_INDEX_KEY, ...ids)
      pipeline.expire(REDIS_INDEX_KEY, REDIS_ITEM_TTL_SEC)
    }
    await pipeline.exec()
  } catch {
    // Не критично
  }
}

// Debounce персиста лога: appendOutput может вызываться построчно на каждый chunk
// stdout/stderr — пишем в Redis не чаще раза в секунду на деплой, а не на каждую строку
const PERSIST_DEBOUNCE_MS = 1000
const pendingPersists = new Map<string, ReturnType<typeof setTimeout>>()

function schedulePersist(deploy: DeployStatus): void {
  const existing = pendingPersists.get(deploy.deployId)
  if (existing) {
    clearTimeout(existing)
  }
  pendingPersists.set(
    deploy.deployId,
    setTimeout(() => {
      pendingPersists.delete(deploy.deployId)
      void persistDeploy(deploy)
    }, PERSIST_DEBOUNCE_MS),
  )
}

/** Немедленный персист в обход debounce — вызывать при завершении/значимых переходах статуса */
function flushPersist(deploy: DeployStatus): void {
  const existing = pendingPersists.get(deploy.deployId)
  if (existing) {
    clearTimeout(existing)
    pendingPersists.delete(deploy.deployId)
  }
  void persistDeploy(deploy)
}

/**
 * Восстанавливает deployHistory из Redis при старте процесса. Записи, застигнутые
 * в состоянии running=true (агент перезапустился, пока деплой шёл) помечаются
 * interrupted — реальный исход неизвестен: nsenter-процесс на хосте физически может
 * быть жив (см. host-exec.ts), но dashboard-agent потерял currentProcess и больше не
 * получает от него stdout/exit code напрямую.
 */
async function rehydrateFromRedis(): Promise<void> {
  const r = getRedis()
  if (!r) {
    return
  }
  try {
    const ids = await r.lrange(REDIS_INDEX_KEY, 0, -1)
    if (ids.length === 0) {
      return
    }
    const items = await r.mget(...ids.map(redisItemKey))
    for (const raw of items) {
      if (!raw) {
        continue
      }
      try {
        const deploy = JSON.parse(raw) as DeployStatus
        // Записи, персистированные до §38 (нет phases в Redis) — бэкфилл пустым массивом.
        deploy.phases = deploy.phases ?? []
        if (deploy.running) {
          deploy.running = false
          deploy.interrupted = true
          deploy.error = deploy.error
            ?? 'Dashboard-agent перезапустился во время этого деплоя — итоговый статус неизвестен'
          deploy.endTime = deploy.endTime ?? new Date().toISOString()
        }
        deployHistory.push(deploy)
      } catch {
        // Битая запись в Redis — пропускаем
      }
    }
    if (deployHistory.length > 0) {
      console.warn(`[deploy] Восстановлено ${deployHistory.length} записей истории деплоя из Redis`)
    }
  } catch (err) {
    console.error('[deploy] Не удалось восстановить историю деплоя из Redis:', err)
  }
}

/** Создаёт новую запись деплоя и кладёт в историю */
function createDeploy(partial: Omit<DeployStatus, 'deployId' | 'output' | 'truncatedLines' | 'phases'>): DeployStatus {
  const deploy: DeployStatus = {
    deployId: randomUUID(),
    output: [],
    truncatedLines: 0,
    phases: [],
    lastOutputAt: new Date().toISOString(),
    ...partial,
  }
  deployHistory.push(deploy)
  if (deployHistory.length > MAX_DEPLOY_HISTORY) {
    deployHistory.shift()
  }
  void persistDeploy(deploy)
  void persistIndex()
  return deploy
}

// =============================================================================
// Long-poll ожидание прогресса (§38 Этап 2) — деплой один на процесс (isDeployRunning
// отклоняет параллельные), поэтому один EventEmitter на все deployId с лихвой хватает.
// =============================================================================

const deployEvents = new EventEmitter()
deployEvents.setMaxListeners(50)

function emitDeployEvent(deployId: string): void {
  deployEvents.emit(deployId)
}

/** Добавляет строку в лог деплоя с вытеснением старых строк при переполнении, обновляет
 * фазы/lastOutputAt и будит все ожидающие deploy_wait для этого deployId. */
function appendOutput(deploy: DeployStatus, line: string): void {
  deploy.output.push(line)
  if (deploy.output.length > MAX_OUTPUT_LINES) {
    deploy.output.shift()
    deploy.truncatedLines++
  }
  deploy.lastOutputAt = new Date().toISOString()
  applyPhaseLine(deploy.phases, line)
  schedulePersist(deploy)
  emitDeployEvent(deploy.deployId)
}

/** Текущий активный или последний завершённый деплой */
function getLatestDeploy(): DeployStatus | undefined {
  return deployHistory[deployHistory.length - 1]
}

/** Есть ли сейчас работающий деплой */
function isDeployRunning(): boolean {
  return deployHistory.some((d) => d.running)
}

/**
 * Выполняет docker команду
 */
async function runDockerCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 120000 })
    return { stdout, stderr }
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message?: string }
    throw new Error(execError.stderr || execError.message || 'Docker command failed', { cause: error })
  }
}

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
  // смерть всего приложения. `try/catch` внутри `rehydrateFromRedis` не помогает — исключения
  // не происходит вовсе, происходит зависание.
  //
  // История деплоев — вещь необязательная (это кеш в памяти, восстанавливаемый из Redis), поэтому
  // 3 секунды и продолжаем без неё. Терять её неприятно, не подняться — недопустимо.
  await withTimeout(rehydrateFromRedis(), {
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
        deploy.running = false
        deploy.endTime = new Date().toISOString()
        flushPersist(deploy)

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
        deploy.running = false
        deploy.endTime = new Date().toISOString()
        deploy.error = error instanceof Error ? error.message : 'Unknown error'
        flushPersist(deploy)

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

        deploy.running = false
        deploy.endTime = new Date().toISOString()
        flushPersist(deploy)

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
        deploy.running = false
        deploy.endTime = new Date().toISOString()
        deploy.error = error instanceof Error ? error.message : 'Unknown error'
        flushPersist(deploy)

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
        deploy.running = false
        deploy.endTime = new Date().toISOString()
        flushPersist(deploy)

        return {
          success: true,
          data: { deployId: deploy.deployId, output },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        deploy.running = false
        deploy.endTime = new Date().toISOString()
        deploy.error = error instanceof Error ? error.message : 'Unknown error'
        flushPersist(deploy)

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

      currentProcess = spawn('nsenter', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, SOPS_AGE_KEY_FILE: sopsKeyFile },
      })

      // Обрабатываем stdout построчно
      currentProcess.stdout?.on('data', (data: Buffer) => {
        const lines = data
          .toString()
          .split('\n')
          .filter((line) => line.trim())
        for (const line of lines) {
          appendOutput(deploy, line)
        }
      })

      // Обрабатываем stderr построчно
      currentProcess.stderr?.on('data', (data: Buffer) => {
        const lines = data
          .toString()
          .split('\n')
          .filter((line) => line.trim())
        for (const line of lines) {
          appendOutput(deploy, `⚠️ ${line}`)
        }
      })

      // Обрабатываем завершение
      currentProcess.on('close', (code) => {
        deploy.exitCode = code
        if (code === 0) {
          appendOutput(deploy, `✅ Deploy completed successfully`)
        } else {
          appendOutput(deploy, `❌ Deploy failed with exit code ${code}`)
          deploy.error = `Process exited with code ${code}`
        }
        deploy.running = false
        deploy.endTime = new Date().toISOString()
        currentProcess = null
        flushPersist(deploy)
        // appendOutput выше уже разбудил ожидающих deploy_wait, но синхронно ДО этой строки —
        // deploy.running там ещё был true. Будим ещё раз теперь, когда running реально false,
        // иначе deploy_wait не отпускается раньше таймаута на терминальном статусе.
        emitDeployEvent(deploy.deployId)
      })

      // Обрабатываем ошибки
      currentProcess.on('error', (error) => {
        appendOutput(deploy, `❌ Process error: ${error.message}`)
        deploy.error = error.message
        deploy.running = false
        deploy.endTime = new Date().toISOString()
        currentProcess = null
        flushPersist(deploy)
        emitDeployEvent(deploy.deployId)
      })

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
   * POST /api/deploy/cancel — отмена текущего деплоя
   */
  fastify.post('/api/deploy/cancel', async (): Promise<ApiResponse<{ deployId: string; cancelled: boolean }>> => {
    const running = deployHistory.find((d) => d.running)

    if (!running || !currentProcess) {
      return {
        success: false,
        error: 'No deploy in progress',
        timestamp: new Date().toISOString(),
      }
    }

    try {
      currentProcess.kill('SIGTERM')
      appendOutput(running, '🛑 Deploy cancelled by user')
      running.error = 'Cancelled by user'
      running.running = false
      running.endTime = new Date().toISOString()
      currentProcess = null
      flushPersist(running)
      emitDeployEvent(running.deployId)

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
