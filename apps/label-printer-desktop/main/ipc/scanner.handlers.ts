/**
 * IPC handlers для сканера штрих-кодов
 */
import { Logger } from '@letar/label-printer-core'
import { ipcMain } from 'electron'
import { scannerService } from '../services/scanner.service'
import { settingsService } from '../services/settings.service'

const getLogger = () => Logger.getInstance()

/** Результат операции сканера */
interface ScannerResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/** Статус сканера */
interface ScannerStatus {
  connected: boolean
  port: string | null
  mode: 'COM' | 'USB_HID' | 'DISABLED'
}

/** Информация о COM-порте */
interface PortInfo {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  locationId?: string
  vendorId?: string
  productId?: string
}

/**
 * Регистрация IPC handlers для сканера
 */
export function registerScannerHandlers(): void {
  // Получить список доступных COM-портов
  ipcMain.handle('scanner:list-ports', async (): Promise<ScannerResult<PortInfo[]>> => {
    try {
      const ports = await scannerService.getAvailablePorts()
      getLogger().debug('[ScannerIPC] list-ports', `Found ${ports.length} ports`)
      return { success: true, data: ports }
    } catch (error) {
      getLogger().error('[ScannerIPC] list-ports failed', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка получения списка портов',
      }
    }
  })

  // Получить текущий статус сканера
  ipcMain.handle('scanner:status', async (): Promise<ScannerResult<ScannerStatus>> => {
    try {
      const status = scannerService.getStatus()
      return { success: true, data: status }
    } catch (error) {
      getLogger().error('[ScannerIPC] status failed', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка получения статуса сканера',
      }
    }
  })

  // Переподключить сканер с новыми настройками
  ipcMain.handle('scanner:reconnect', async (): Promise<ScannerResult<ScannerStatus>> => {
    try {
      getLogger().info('[ScannerIPC] reconnect', 'Reconnecting scanner...')
      const config = await settingsService.getScannerConfig()
      await scannerService.disconnect()
      const result = await scannerService.connect(config)
      getLogger().info('[ScannerIPC] reconnect', `Reconnect result: ${result.connected ? 'success' : 'failed'}`)
      return { success: true, data: result }
    } catch (error) {
      getLogger().error('[ScannerIPC] reconnect failed', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка переподключения сканера',
      }
    }
  })

  // Отключить сканер
  ipcMain.handle('scanner:disconnect', async (): Promise<ScannerResult<boolean>> => {
    try {
      getLogger().info('[ScannerIPC] disconnect', 'Disconnecting scanner...')
      await scannerService.disconnect()
      getLogger().info('[ScannerIPC] disconnect', 'Scanner disconnected')
      return { success: true, data: true }
    } catch (error) {
      getLogger().error('[ScannerIPC] disconnect failed', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Ошибка отключения сканера',
      }
    }
  })
}
