/**
 * IPC хендлеры для Mobile Server
 *
 * Управление мобильным сервером для доступа к библиотеке с телефона
 */

import { app } from 'electron'
import path from 'path'

import { generateQRCode, getMobileServer, type MobileServerStatus } from '../services/mobile-server'
import { createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует IPC хендлеры для Mobile Server
 */
export function registerMobileServerHandlers(): void {
  const server = getMobileServer()

  // Запустить сервер
  createHandler('mobile-server:start', async (port?: number) => {
    // Путь к статическим файлам mobile-ui (в resources для production)
    const isProd = app.isPackaged
    const staticPath = isProd
      ? path.join(process.resourcesPath, 'mobile-ui')
      : path.join(app.getAppPath(), 'mobile-ui', 'dist')

    await server.start({ port, staticPath })
    return server.getStatus()
  })

  // Остановить сервер
  createHandler('mobile-server:stop', async () => {
    await server.stop()
  })

  // Получить статус
  createHandler('mobile-server:status', (): MobileServerStatus => {
    return server.getStatus()
  })

  // Получить QR-код для подключения
  createHandler('mobile-server:getQRCode', async (): Promise<string | null> => {
    const status = server.getStatus()
    if (!status.url) {
      return null
    }
    return generateQRCode(status.url)
  })

  // Обновить локальный IP (при смене сети)
  createHandler('mobile-server:refreshIp', () => {
    server.refreshLocalIp()
    return server.getStatus()
  })
}
