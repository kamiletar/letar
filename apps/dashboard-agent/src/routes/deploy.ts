/**
 * Deploy API Routes
 * API для деплоя на удалённых серверах
 * Поддерживает: pull images, restart containers, deploy-affected.sh
 */

import { type ChildProcess, exec, spawn } from 'child_process'
import type { FastifyInstance } from 'fastify'
import { promisify } from 'util'
import type { ApiResponse } from '../types'

const execAsync = promisify(exec)

// Статус текущего деплоя
interface DeployStatus {
  running: boolean
  containerId?: string
  action?: 'pull' | 'restart' | 'pull-restart'
  startTime?: string
  output: string[]
  error?: string
}

let currentDeploy: DeployStatus = {
  running: false,
  output: [],
}

// Текущий процесс деплоя (для возможности отмены)
let currentProcess: ChildProcess | null = null

/**
 * Выполняет docker команду
 */
async function runDockerCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, { timeout: 120000 })
    return { stdout, stderr }
  } catch (error) {
    const execError = error as { stdout?: string; stderr?: string; message?: string }
    throw new Error(execError.stderr || execError.message || 'Docker command failed')
  }
}

export async function deployRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/deploy/status — статус текущего деплоя
   */
  fastify.get('/api/deploy/status', async (): Promise<ApiResponse<DeployStatus>> => {
    return {
      success: true,
      data: currentDeploy,
      timestamp: new Date().toISOString(),
    }
  })

  /**
   * POST /api/deploy/pull — pull Docker image
   */
  fastify.post<{ Body: { image: string } }>(
    '/api/deploy/pull',
    async (request): Promise<ApiResponse<{ image: string; output: string }>> => {
      try {
        const { image } = request.body

        if (!image) {
          return {
            success: false,
            error: 'Image name is required',
            timestamp: new Date().toISOString(),
          }
        }

        currentDeploy = {
          running: true,
          action: 'pull',
          startTime: new Date().toISOString(),
          output: [`Pulling image: ${image}`],
        }

        const { stdout, stderr } = await runDockerCommand(`docker pull ${image}`)

        currentDeploy.output.push(stdout || stderr || 'Pull completed')
        currentDeploy.running = false

        return {
          success: true,
          data: {
            image,
            output: stdout || stderr,
          },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        currentDeploy.running = false
        currentDeploy.error = error instanceof Error ? error.message : 'Unknown error'

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    }
  )

  /**
   * POST /api/deploy/restart — restart container with latest image
   */
  fastify.post<{ Body: { containerId: string; pull?: boolean } }>(
    '/api/deploy/restart',
    async (request): Promise<ApiResponse<{ containerId: string; output: string[] }>> => {
      try {
        const { containerId, pull = false } = request.body

        if (!containerId) {
          return {
            success: false,
            error: 'Container ID is required',
            timestamp: new Date().toISOString(),
          }
        }

        const output: string[] = []

        currentDeploy = {
          running: true,
          containerId,
          action: pull ? 'pull-restart' : 'restart',
          startTime: new Date().toISOString(),
          output: [],
        }

        // Получаем информацию о контейнере
        const { stdout: inspectOutput } = await runDockerCommand(
          `docker inspect ${containerId} --format '{{.Config.Image}}'`
        )
        const imageName = inspectOutput.trim()
        output.push(`Container image: ${imageName}`)
        currentDeploy.output.push(`Container image: ${imageName}`)

        // Pull если нужно
        if (pull && imageName) {
          output.push(`Pulling latest image: ${imageName}`)
          currentDeploy.output.push(`Pulling latest image: ${imageName}`)

          const { stdout: pullOutput } = await runDockerCommand(`docker pull ${imageName}`)
          output.push(pullOutput || 'Pull completed')
          currentDeploy.output.push(pullOutput || 'Pull completed')
        }

        // Restart контейнера
        output.push(`Restarting container: ${containerId}`)
        currentDeploy.output.push(`Restarting container: ${containerId}`)

        await runDockerCommand(`docker restart ${containerId}`)
        output.push('Container restarted successfully')
        currentDeploy.output.push('Container restarted successfully')

        currentDeploy.running = false

        return {
          success: true,
          data: {
            containerId,
            output,
          },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        currentDeploy.running = false
        currentDeploy.error = error instanceof Error ? error.message : 'Unknown error'

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    }
  )

  /**
   * POST /api/deploy/compose-up — docker compose up для stack
   */
  fastify.post<{ Body: { composePath: string; services?: string[] } }>(
    '/api/deploy/compose-up',
    async (request): Promise<ApiResponse<{ output: string }>> => {
      try {
        const { composePath, services = [] } = request.body

        if (!composePath) {
          return {
            success: false,
            error: 'Compose file path is required',
            timestamp: new Date().toISOString(),
          }
        }

        currentDeploy = {
          running: true,
          action: 'pull-restart',
          startTime: new Date().toISOString(),
          output: [`Running docker compose up for: ${composePath}`],
        }

        const servicesArg = services.length > 0 ? services.join(' ') : ''
        const command = `docker compose -f ${composePath} up -d --pull always ${servicesArg}`

        currentDeploy.output.push(`Command: ${command}`)

        const { stdout, stderr } = await runDockerCommand(command)
        const output = stdout || stderr || 'Compose up completed'

        currentDeploy.output.push(output)
        currentDeploy.running = false

        return {
          success: true,
          data: { output },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        currentDeploy.running = false
        currentDeploy.error = error instanceof Error ? error.message : 'Unknown error'

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    }
  )

  /**
   * POST /api/deploy/app — полный деплой приложения через deploy-affected.sh
   * Использует spawn для стриминга логов в реальном времени
   */
  fastify.post<{ Body: { appName: string } }>(
    '/api/deploy/app',
    async (request): Promise<ApiResponse<{ appName: string; started: boolean }>> => {
      const REPO_PATH = process.env.REPO_PATH || '/home/deploy/lena'

      try {
        const { appName } = request.body

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

        // Если уже есть запущенный деплой — отклоняем
        if (currentDeploy.running) {
          return {
            success: false,
            error: 'Another deploy is already in progress',
            timestamp: new Date().toISOString(),
          }
        }

        // Сбрасываем статус и начинаем новый деплой
        currentDeploy = {
          running: true,
          action: 'pull-restart',
          startTime: new Date().toISOString(),
          output: [`🚀 Deploying app: ${appName}`],
        }

        // Выполняем на хосте через nsenter (требует pid: host и privileged: true)
        const hostCommand = `cd ${REPO_PATH} && ./deploy-affected.sh --app ${appName}`
        currentDeploy.output.push(`📋 Command: ${hostCommand}`)

        // Запускаем через spawn для стриминга
        currentProcess = spawn('nsenter', ['-t', '1', '-m', '-u', '-n', '-i', '--', 'bash', '-c', hostCommand], {
          stdio: ['ignore', 'pipe', 'pipe'],
        })

        // Обрабатываем stdout построчно
        currentProcess.stdout?.on('data', (data: Buffer) => {
          const lines = data
            .toString()
            .split('\n')
            .filter((line) => line.trim())
          for (const line of lines) {
            currentDeploy.output.push(line)
          }
        })

        // Обрабатываем stderr построчно
        currentProcess.stderr?.on('data', (data: Buffer) => {
          const lines = data
            .toString()
            .split('\n')
            .filter((line) => line.trim())
          for (const line of lines) {
            currentDeploy.output.push(`⚠️ ${line}`)
          }
        })

        // Обрабатываем завершение
        currentProcess.on('close', (code) => {
          if (code === 0) {
            currentDeploy.output.push(`✅ Deploy completed successfully`)
          } else {
            currentDeploy.output.push(`❌ Deploy failed with exit code ${code}`)
            currentDeploy.error = `Process exited with code ${code}`
          }
          currentDeploy.running = false
          currentProcess = null
        })

        // Обрабатываем ошибки
        currentProcess.on('error', (error) => {
          currentDeploy.output.push(`❌ Process error: ${error.message}`)
          currentDeploy.error = error.message
          currentDeploy.running = false
          currentProcess = null
        })

        // Возвращаем сразу — клиент будет опрашивать статус через /api/deploy/status
        return {
          success: true,
          data: {
            appName,
            started: true,
          },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        currentDeploy.running = false
        currentProcess = null
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        currentDeploy.error = errorMessage

        return {
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        }
      }
    }
  )

  /**
   * POST /api/deploy/cancel — отмена текущего деплоя
   */
  fastify.post('/api/deploy/cancel', async (): Promise<ApiResponse<{ cancelled: boolean }>> => {
    if (!currentDeploy.running || !currentProcess) {
      return {
        success: false,
        error: 'No deploy in progress',
        timestamp: new Date().toISOString(),
      }
    }

    try {
      currentProcess.kill('SIGTERM')
      currentDeploy.output.push('🛑 Deploy cancelled by user')
      currentDeploy.error = 'Cancelled by user'
      currentDeploy.running = false
      currentProcess = null

      return {
        success: true,
        data: { cancelled: true },
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
