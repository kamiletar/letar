/**
 * Утилита для поиска свободного порта
 * Используется для запуска Next.js сервера на динамическом порту
 */
import { createServer, type Server } from 'net'

import { createModuleLogger } from './logger'

const log = createModuleLogger('PortFinder')

/**
 * Проверить, свободен ли порт
 */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server: Server = createServer()

    server.once('error', () => {
      resolve(false)
    })

    server.once('listening', () => {
      server.close()
      resolve(true)
    })

    server.listen(port, '127.0.0.1')
  })
}

/**
 * Найти свободный порт, начиная с предпочтительного
 * @param preferredPort Предпочтительный порт
 * @param maxAttempts Максимальное количество попыток
 */
export async function getAvailablePort(preferredPort = 3007, maxAttempts = 200): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = preferredPort + i
    const isFree = await isPortFree(port)
    if (isFree) {
      log.info(`Found free port: ${port}`, { attempts: i })
      return port
    }
  }

  throw new Error(`Could not find free port after ${maxAttempts} attempts starting from ${preferredPort}`)
}
