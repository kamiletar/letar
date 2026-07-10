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
import type { FastifyInstance } from 'fastify'
import { promisify } from 'util'
import { getCurrentServer } from '../lib/server-config'
import type { ApiResponse } from '../types'

const execAsync = promisify(exec)

// Ограничения хранения: сколько деплоев помним и сколько строк лога на деплой
const MAX_DEPLOY_HISTORY = 20
const MAX_OUTPUT_LINES = 2000

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
}

// Ring-buffer истории деплоев: новые в конец, старые вытесняются
const deployHistory: DeployStatus[] = []

// Текущий процесс деплоя (для возможности отмены)
let currentProcess: ChildProcess | null = null

/** Создаёт новую запись деплоя и кладёт в историю */
function createDeploy(partial: Omit<DeployStatus, 'deployId' | 'output' | 'truncatedLines'>): DeployStatus {
  const deploy: DeployStatus = {
    deployId: randomUUID(),
    output: [],
    truncatedLines: 0,
    ...partial,
  }
  deployHistory.push(deploy)
  if (deployHistory.length > MAX_DEPLOY_HISTORY) {
    deployHistory.shift()
  }
  return deploy
}

/** Добавляет строку в лог деплоя с вытеснением старых строк при переполнении */
function appendOutput(deploy: DeployStatus, line: string): void {
  deploy.output.push(line)
  if (deploy.output.length > MAX_OUTPUT_LINES) {
    deploy.output.shift()
    deploy.truncatedLines++
  }
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
      ApiResponse<Omit<DeployStatus, 'output'> & { output: string[]; totalLines: number; fromLine: number }>
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

      return {
        success: true,
        data: { ...deploy, output, totalLines, fromLine },
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

        return {
          success: true,
          data: { deployId: deploy.deployId, output },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        deploy.running = false
        deploy.endTime = new Date().toISOString()
        deploy.error = error instanceof Error ? error.message : 'Unknown error'

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
   * Body: { appName: string; staging?: boolean }
   * staging: true → deploy-affected.sh --staging (образ <app>:staging, для s3)
   *
   * Асинхронный: сразу возвращает deployId, клиент опрашивает /api/deploy/status.
   * Аргументы передаются spawn'у массивом — без промежуточного bash -c,
   * инъекция через body структурно невозможна.
   */
  fastify.post<{ Body: { appName: string; staging?: boolean } }>(
    '/api/deploy/app',
    async (
      request,
    ): Promise<ApiResponse<{ deployId: string; appName: string; staging: boolean; started: boolean }>> => {
      const REPO_PATH = process.env.REPO_PATH || '/home/deploy/letar'

      const { appName, staging = false } = request.body

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

      appendOutput(deploy, `🚀 Deploying app: ${appName}${staging ? ' (staging)' : ''}`)

      // Аргументы массивом: nsenter выполняет скрипт на хосте (pid: host + privileged),
      // скрипт сам делает cd в свою директорию (SCRIPT_DIR в deploy-affected.sh)
      const scriptPath = `${REPO_PATH}/deploy-affected.sh`
      const args = ['-t', '1', '-m', '-u', '-n', '-i', '--', scriptPath, '--app', appName]
      if (staging) {
        args.push('--staging')
      }
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
      })

      // Обрабатываем ошибки
      currentProcess.on('error', (error) => {
        appendOutput(deploy, `❌ Process error: ${error.message}`)
        deploy.error = error.message
        deploy.running = false
        deploy.endTime = new Date().toISOString()
        currentProcess = null
      })

      // Возвращаем сразу — клиент будет опрашивать статус через /api/deploy/status
      return {
        success: true,
        data: {
          deployId: deploy.deployId,
          appName,
          staging,
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
