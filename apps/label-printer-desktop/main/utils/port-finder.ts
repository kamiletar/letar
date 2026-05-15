/**
 * Утилита для поиска свободного порта
 * Используется для запуска Next.js сервера на динамическом порту
 */
import { createServer, type Server } from 'net'

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
 * Найти свободный порт в заданном диапазоне
 * @param startPort Начальный порт (по умолчанию 3000)
 * @param endPort Конечный порт (по умолчанию 3100)
 * @returns Свободный порт или null если не найден
 */
export async function findFreePort(startPort = 3000, endPort = 3100): Promise<number | null> {
  for (let port = startPort; port <= endPort; port++) {
    const isFree = await isPortFree(port)
    if (isFree) {
      return port
    }
  }
  return null
}

/**
 * Найти свободный порт, начиная с предпочтительного
 * @param preferredPort Предпочтительный порт
 * @param maxAttempts Максимальное количество попыток
 */
export async function getAvailablePort(preferredPort = 3000, maxAttempts = 100): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = preferredPort + i
    const isFree = await isPortFree(port)
    if (isFree) {
      return port
    }
  }

  throw new Error(`Could not find free port after ${maxAttempts} attempts starting from ${preferredPort}`)
}
