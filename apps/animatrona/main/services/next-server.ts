/**
 * Next.js Server Service — управление standalone сервером
 *
 * В production Animatrona запускает Next.js standalone сервер
 * и загружает UI через localhost.
 */

import { type ChildProcess, fork } from 'child_process'
import { app, type UtilityProcess, utilityProcess } from 'electron'
import path from 'path'

import { createModuleLogger } from '../utils/logger'
import { getAvailablePort } from '../utils/port-finder'
import { getDatabasePath, getDatabaseUrl } from './database'

const log = createModuleLogger('NextServer')

/** Проверка production режима */
const isProd = app.isPackaged || process.env.NODE_ENV === 'production'

/** Ссылка на процесс Next.js сервера */
let nextServer: ChildProcess | UtilityProcess | null = null

/** Текущий порт сервера */
let serverPort = 3007

/**
 * Получить текущий порт сервера
 */
export function getServerPort(): number {
  return serverPort
}

/**
 * Запуск Next.js standalone сервера
 * Возвращает порт, на котором запущен сервер
 */
export async function startNextServer(): Promise<number> {
  const port = await getAvailablePort(3007)
  serverPort = port

  // Путь к standalone серверу (Next.js сохраняет структуру монорепо)
  const standaloneDir = path.join(process.resourcesPath, 'standalone')
  const serverPath = path.join(standaloneDir, 'apps', 'animatrona', 'renderer', 'server.js')
  const serverCwd = path.join(standaloneDir, 'apps', 'animatrona', 'renderer')

  return new Promise((resolve, reject) => {
    // Пути для базы данных
    const databasePath = getDatabasePath()
    const databaseUrl = getDatabaseUrl()

    // NODE_PATH для поиска модулей в standalone/apps/node_modules
    // server.js в extraResources (реальный FS) находит модули через Node.js traversal:
    // renderer/ → animatrona/ → apps/node_modules/ ← standalone/apps/node_modules
    // NODE_PATH задаём явно как страховку на случай нестандартных require() в server.js
    const standaloneNodeModules = path.join(standaloneDir, 'apps', 'node_modules')

    // В production используем utilityProcess.fork() из Electron
    if (isProd) {
      nextServer = utilityProcess.fork(serverPath, [], {
        env: {
          ...process.env,
          PORT: String(port),
          HOSTNAME: '127.0.0.1',
          NODE_ENV: 'production',
          NODE_PATH: standaloneNodeModules,
          DATABASE_PATH: databasePath,
          DATABASE_URL: databaseUrl,
        },
        cwd: serverCwd,
        stdio: 'pipe',
      })

      nextServer.stdout?.on('data', (data) => {
        const msg = data.toString().trim()
        if (msg.includes('Ready') || msg.includes('started server') || msg.includes('Listening')) {
          resolve(port)
        }
      })

      nextServer.stderr?.on('data', (data) => {
        const msg = data.toString().trim()
        log.error('Next.js stderr', { message: msg }, { full: true })
      })

      nextServer.on('exit', (code) => {
        log.error('Next.js server завершился', { code })
        nextServer = null
      })
    } else {
      // В development используем child_process.fork
      nextServer = fork(serverPath, [], {
        env: {
          ...process.env,
          PORT: String(port),
          HOSTNAME: '127.0.0.1',
          NODE_ENV: 'production',
          DATABASE_PATH: databasePath,
          DATABASE_URL: databaseUrl,
        },
        cwd: serverCwd,
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      })

      nextServer.stdout?.on('data', (data) => {
        const msg = data.toString().trim()
        if (msg.includes('Ready') || msg.includes('started server')) {
          resolve(port)
        }
      })

      nextServer.on('error', (err: Error) => {
        reject(err)
      })

      nextServer.on('close', (code) => {
        log.error('Next.js server завершился (dev)', { code })
        nextServer = null
      })
    }

    // Таймаут на случай если сервер не стартует
    setTimeout(() => {
      resolve(port)
    }, 5000)
  })
}

/**
 * Остановка Next.js сервера
 */
export function stopNextServer(): void {
  if (nextServer) {
    if ('kill' in nextServer && typeof nextServer.kill === 'function') {
      nextServer.kill()
    }
    nextServer = null
  }
}
