/**
 * Logger сервис для Electron приложения
 * Логирует в консоль и в файл (в production)
 */

import { app } from 'electron'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Уровни логирования
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Цвета для консоли
const COLORS = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m', // green
  warn: '\x1b[33m', // yellow
  error: '\x1b[31m', // red
  reset: '\x1b[0m',
}

/**
 * Класс Logger для централизованного логирования
 */
class Logger {
  private logPath: string | null = null
  private logStream: fs.WriteStream | null = null
  private minLevel: LogLevel = 'info'
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  /**
   * Инициализация логгера (вызывается после app.whenReady())
   */
  init(options: { minLevel?: LogLevel; fileName?: string } = {}) {
    this.minLevel = options.minLevel ?? 'info'

    // В production — пишем в файл
    if (app.isPackaged) {
      const logsDir = path.join(app.getPath('userData'), 'logs')

      // Создаём директорию если не существует
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }

      const fileName = options.fileName ?? `app-${this.getDateString()}.log`
      this.logPath = path.join(logsDir, fileName)

      this.logStream = fs.createWriteStream(this.logPath, { flags: 'a' })
      this.info('Logger', `Log file: ${this.logPath}`)
    }

    return this
  }

  /**
   * Получить текущую дату в формате YYYY-MM-DD
   */
  private getDateString(): string {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }

  /**
   * Получить timestamp в формате HH:MM:SS.mmm
   */
  private getTimestamp(): string {
    const now = new Date()
    return now.toISOString().replace('T', ' ').slice(0, -1)
  }

  /**
   * Форматировать сообщение
   */
  private formatMessage(level: LogLevel, context: string, message: string, data?: unknown): string {
    const timestamp = this.getTimestamp()
    const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : ''
    return `[${timestamp}] [${level.toUpperCase().padEnd(5)}] [${context}] ${message}${dataStr}`
  }

  /**
   * Проверить нужно ли логировать этот уровень
   */
  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel]
  }

  /**
   * Записать в лог
   */
  private log(level: LogLevel, context: string, message: string, data?: unknown) {
    if (!this.shouldLog(level)) {
      return
    }

    const formatted = this.formatMessage(level, context, message, data)
    const color = COLORS[level]

    // Консоль (с цветом)
    // eslint-disable-next-line no-console -- сервис логирования, намеренный вывод в консоль
    console.log(`${color}${formatted}${COLORS.reset}`)

    // Файл (без цвета)
    if (this.logStream) {
      this.logStream.write(formatted + '\n')
    }
  }

  // Публичные методы
  debug(context: string, message: string, data?: unknown) {
    this.log('debug', context, message, data)
  }

  info(context: string, message: string, data?: unknown) {
    this.log('info', context, message, data)
  }

  warn(context: string, message: string, data?: unknown) {
    this.log('warn', context, message, data)
  }

  error(context: string, message: string, error?: unknown) {
    // Преобразуем Error в сериализуемый объект
    let errorData = error
    if (error instanceof Error) {
      errorData = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }
    this.log('error', context, message, errorData)
  }

  /**
   * Получить путь к файлу логов
   */
  getLogPath(): string | null {
    return this.logPath
  }

  /**
   * Закрыть поток записи
   */
  close() {
    if (this.logStream) {
      this.logStream.end()
      this.logStream = null
    }
  }
}

// Экспортируем singleton
export const logger = new Logger()
