/**
 * Сервис для работы со сканером через COM-порт
 *
 * Поддерживает два режима:
 * - COM-порт (RS-232): Использует serialport для чтения данных
 * - USB HID (клавиатура): Данные приходят через события клавиатуры в renderer
 */
import { Logger } from '@letar/label-printer-core'
import type { BrowserWindow } from 'electron'
import { SerialPort } from 'serialport'

/** Ленивое получение логгера */
const getLogger = () => Logger.getInstance()

export interface ScannerConfig {
  port: string // COM5, COM3, etc.
  baudRate: number // 9600, 115200, etc.
  enabled: boolean
}

/**
 * Сервис управления сканером штрих-кодов
 */
export class ScannerService {
  private serialPort: SerialPort | null = null
  private mainWindow: BrowserWindow | null = null
  private config: ScannerConfig | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private isReconnecting = false
  // Буфер для накопления данных
  private dataBuffer = ''
  private bufferTimeout: ReturnType<typeof setTimeout> | null = null
  private readonly BUFFER_TIMEOUT_MS = 100 // Таймаут для сброса буфера

  /**
   * Инициализировать сервис с окном для отправки событий
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  /**
   * Подключиться к сканеру
   */
  async connect(config: ScannerConfig): Promise<boolean> {
    this.config = config

    // Если порт не указан или пустой — используем USB HID режим
    if (!config.port || config.port.trim() === '') {
      getLogger().info('[Scanner] USB HID mode (no COM port configured)')
      return true
    }

    if (!config.enabled) {
      getLogger().info('[Scanner] Disabled by settings')
      return false
    }

    try {
      await this.openPort(config.port, config.baudRate)
      return true
    } catch (error) {
      getLogger().error('[Scanner] Failed to connect:', error)
      this.scheduleReconnect()
      return false
    }
  }

  /**
   * Открыть COM-порт
   */
  private async openPort(portPath: string, baudRate: number): Promise<void> {
    return new Promise((resolve, reject) => {
      getLogger().info(`[Scanner] Opening ${portPath} at ${baudRate} baud...`)

      this.serialPort = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false,
      })

      // Читаем данные напрямую без парсера (сканер может не отправлять \r\n)
      this.serialPort.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8')
        getLogger().info(`[Scanner] Raw chunk: ${JSON.stringify(chunk)} (${data.length} bytes)`)
        this.appendToBuffer(chunk)
      })

      // Обработка ошибок
      this.serialPort.on('error', (err) => {
        getLogger().error('[Scanner] Serial port error:', err.message)
        this.scheduleReconnect()
      })

      // Обработка закрытия порта
      this.serialPort.on('close', () => {
        getLogger().warn('[Scanner] Port closed')
        this.scheduleReconnect()
      })

      // Открываем порт
      this.serialPort.open((err) => {
        if (err) {
          getLogger().error(`[Scanner] Failed to open ${portPath}: ${err.message}`)
          reject(err)
        } else {
          getLogger().info(`[Scanner] Connected to ${portPath}`)
          this.isReconnecting = false
          resolve()
        }
      })
    })
  }

  /**
   * Добавить данные в буфер и запланировать обработку
   */
  private appendToBuffer(chunk: string): void {
    // Очищаем предыдущий таймер
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout)
    }

    // Добавляем в буфер
    this.dataBuffer += chunk

    // Устанавливаем таймаут — когда данные перестанут приходить, обрабатываем буфер
    this.bufferTimeout = setTimeout(() => {
      this.flushBuffer()
    }, this.BUFFER_TIMEOUT_MS)
  }

  /**
   * Обработать накопленный буфер
   */
  private flushBuffer(): void {
    if (this.dataBuffer.length === 0) {
      return
    }

    // Очищаем управляющие символы (\r, \n, etc.) — это намеренная regex для sanitize данных сканера
    // eslint-disable-next-line no-control-regex
    const code = this.dataBuffer.replace(/[\r\n\x00-\x1F]/g, '').trim()
    this.dataBuffer = ''

    if (code.length > 0) {
      this.handleScanData(code)
    }
  }

  /**
   * Обработка полученных данных от сканера
   */
  private handleScanData(code: string): void {
    if (!code || code.length < 5) {
      getLogger().debug('[Scanner] Ignoring short data:', code)
      return
    }

    getLogger().info(`[Scanner] Received code: ${code.substring(0, 30)}...`)

    // Отправляем событие в renderer процесс
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('scanner:input', code)
    } else {
      getLogger().warn('[Scanner] No main window to send scanner input')
    }
  }

  /**
   * Запланировать переподключение
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting || !this.config?.enabled) {
      return
    }

    this.isReconnecting = true
    const delay = 5000 // 5 секунд

    getLogger().info(`[Scanner] Will reconnect in ${delay / 1000}s...`)

    this.reconnectTimer = setTimeout(async () => {
      if (this.config) {
        try {
          await this.disconnect()
          await this.connect(this.config)
        } catch {
          // Ошибка уже залогирована в connect()
        }
      }
    }, delay)
  }

  /**
   * Отключиться от сканера
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout)
      this.bufferTimeout = null
    }

    this.dataBuffer = ''

    if (this.serialPort && this.serialPort.isOpen) {
      return new Promise((resolve) => {
        this.serialPort!.close((err) => {
          if (err) {
            getLogger().warn('[Scanner] Error closing port:', err.message)
          }
          this.serialPort = null
          resolve()
        })
      })
    }

    this.serialPort = null
  }

  /**
   * Получить список доступных COM-портов
   */
  async getAvailablePorts(): Promise<string[]> {
    try {
      const ports = await SerialPort.list()
      return ports.map((p) => p.path).filter((p) => p.startsWith('COM'))
    } catch (error) {
      getLogger().error('[Scanner] Failed to list ports:', error)
      return []
    }
  }

  /**
   * Проверить, подключен ли сканер
   */
  isConnected(): boolean {
    return this.serialPort?.isOpen ?? false
  }

  /**
   * Получить текущий статус
   */
  getStatus(): { connected: boolean; port: string | null; mode: 'COM' | 'USB_HID' } {
    if (!this.config?.port || this.config.port.trim() === '') {
      return { connected: true, port: null, mode: 'USB_HID' }
    }

    return {
      connected: this.serialPort?.isOpen ?? false,
      port: this.config.port,
      mode: 'COM',
    }
  }
}

// Синглтон
export const scannerService = new ScannerService()
