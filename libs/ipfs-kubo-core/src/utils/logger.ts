/**
 * Централизованный логгер для main process
 *
 * Особенности:
 * - Structured logging с контекстом
 * - Уровни логирования (debug, info, warn, error)
 * - Временные метки ISO 8601
 * - Форматирование для консоли Electron
 * - Запись в файл (ротация по размеру, 3 файла по 5MB)
 * - Возможность фильтрации по уровню через env
 *
 * @example
 * import { logger } from '../utils/logger'
 *
 * const log = logger.child('FFmpeg')
 * log.info('Starting transcode', { input: '/path/to/file.mkv' })
 * log.error('Transcode failed', { error: err.message, code: err.code })
 */

import fs from 'fs'
import path from 'path'

import { app } from 'electron'

/** Уровни логирования */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/** Уровни для сравнения (меньше = более verbose) */
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/** Цвета для консоли (ANSI escape codes) */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
} as const

/** Цвет для каждого уровня */
const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.dim,
  info: COLORS.green,
  warn: COLORS.yellow,
  error: COLORS.red,
}

/** Метка для каждого уровня */
const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: 'DBG',
  info: 'INF',
  warn: 'WRN',
  error: 'ERR',
}

// === Файловый логгер ===

const MAX_LOG_SIZE = 5 * 1024 * 1024 // 5 MB
const MAX_LOG_FILES = 3 // main.log, main.1.log, main.2.log

/** Состояние файлового логгера */
let logFilePath: string | null = null
let logStream: fs.WriteStream | null = null
let currentLogSize = 0
let fileLoggerInitialized = false

/** Инициализация файлового логгера (lazy — при первом вызове) */
function ensureFileLogger(): void {
  if (fileLoggerInitialized) {
    return
  }
  fileLoggerInitialized = true

  try {
    const logsDir = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(logsDir, { recursive: true })

    logFilePath = path.join(logsDir, 'main.log')

    // Определяем текущий размер файла
    try {
      const stats = fs.statSync(logFilePath)
      currentLogSize = stats.size
    } catch {
      currentLogSize = 0
    }

    logStream = fs.createWriteStream(logFilePath, { flags: 'a' })
    logStream.on('error', () => {
      // Ошибка записи — отключаем файловый логгер
      logStream = null
    })
  } catch {
    // app.getPath может быть недоступен до ready — пропускаем
    fileLoggerInitialized = false
  }
}

/** Ротация логов: main.log → main.1.log → main.2.log → удаление */
function rotateLogFiles(): void {
  if (!logFilePath) {
    return
  }

  try {
    // Закрываем текущий стрим
    logStream?.end()
    logStream = null

    const dir = path.dirname(logFilePath)
    const base = path.basename(logFilePath, '.log')

    // Удаляем самый старый
    const oldest = path.join(dir, `${base}.${MAX_LOG_FILES - 1}.log`)
    try {
      fs.unlinkSync(oldest)
    } catch {
      /* не существует */
    }

    // Сдвигаем: N-1 → N
    for (let i = MAX_LOG_FILES - 2; i >= 1; i--) {
      const from = path.join(dir, `${base}.${i}.log`)
      const to = path.join(dir, `${base}.${i + 1}.log`)
      try {
        fs.renameSync(from, to)
      } catch {
        /* не существует */
      }
    }

    // main.log → main.1.log
    try {
      fs.renameSync(logFilePath, path.join(dir, `${base}.1.log`))
    } catch {
      /* не существует */
    }

    // Новый стрим
    currentLogSize = 0
    logStream = fs.createWriteStream(logFilePath, { flags: 'a' })
    logStream.on('error', () => {
      logStream = null
    })
  } catch {
    // Ротация не удалась — продолжаем без файла
  }
}

/** Запись строки в лог-файл */
function writeToFile(plainLine: string): void {
  ensureFileLogger()

  if (!logStream) {
    return
  }

  const bytes = Buffer.byteLength(plainLine, 'utf-8') + 1 // +1 для \n
  currentLogSize += bytes

  logStream.write(plainLine + '\n')

  // Ротация при превышении лимита
  if (currentLogSize >= MAX_LOG_SIZE) {
    rotateLogFiles()
  }
}

// === Форматирование ===

/**
 * Получить текущий уровень логирования из env
 */
function getMinLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase()
  if (envLevel && envLevel in LOG_LEVELS) {
    return envLevel as LogLevel
  }
  // Production: только warn и error
  // Development: всё
  return process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
}

/**
 * Форматирует дополнительные данные для вывода
 * @param meta - данные для вывода
 * @param truncate - обрезать ли длинные значения (по умолчанию true)
 */
function formatMeta(meta?: Record<string, unknown>, truncate = true): string {
  if (!meta || Object.keys(meta).length === 0) {
    return ''
  }

  const formatted = Object.entries(meta).map(([key, value]) => {
    let str = String(value)
    // Обрезаем только если truncate=true и значение длиннее 100 символов
    if (truncate && str.length > 100) {
      str = str.slice(0, 100) + '...'
    }
    return `${key}=${str}`
  })

  return ` [${formatted.join(', ')}]`
}

/**
 * Форматирует meta без ANSI цветов (для файла)
 */
function formatMetaPlain(meta?: Record<string, unknown>, truncate = true): string {
  if (!meta || Object.keys(meta).length === 0) {
    return ''
  }

  const formatted = Object.entries(meta).map(([key, value]) => {
    let str = String(value)
    if (truncate && str.length > 100) {
      str = str.slice(0, 100) + '...'
    }
    return `${key}=${str}`
  })

  return ` [${formatted.join(', ')}]`
}

/**
 * Опции для error метода
 */
export interface ErrorOptions {
  /** Показать полный вывод без обрезки (для стектрейсов) */
  full?: boolean
}

/**
 * Интерфейс дочернего логгера
 */
export interface Logger {
  /** Debug сообщение (verbose) */
  debug(message: string, meta?: Record<string, unknown>): void
  /** Информационное сообщение */
  info(message: string, meta?: Record<string, unknown>): void
  /** Предупреждение */
  warn(message: string, meta?: Record<string, unknown>): void
  /** Ошибка (по умолчанию обрезает, с { full: true } — полный вывод) */
  error(message: string, meta?: Record<string, unknown>, options?: ErrorOptions): void
  /** Создать дочерний логгер с дополнительным контекстом */
  child(name: string): Logger
}

/**
 * Создаёт логгер с указанным контекстом
 */
function createLogger(context: string[]): Logger {
  const minLevel = getMinLevel()
  const minLevelNum = LOG_LEVELS[minLevel]
  const contextStr = context.length > 0 ? `${COLORS.cyan}[${context.join(':')}]${COLORS.reset} ` : ''
  const contextStrPlain = context.length > 0 ? `[${context.join(':')}] ` : ''

  const log = (level: LogLevel, message: string, meta?: Record<string, unknown>, noTruncate = false) => {
    // Фильтрация по уровню
    if (LOG_LEVELS[level] < minLevelNum) {
      return
    }

    const timestamp = new Date().toISOString()
    const levelColor = LEVEL_COLORS[level]
    const levelLabel = LEVEL_LABELS[level]
    const truncate = !noTruncate

    // Консоль (с цветами)
    const metaStr = formatMeta(meta, truncate)
    const output =
      `${COLORS.dim}${timestamp}${COLORS.reset} ${levelColor}${levelLabel}${COLORS.reset} ${contextStr}${message}${metaStr}`

    switch (level) {
      case 'debug':
      case 'info':
      case 'warn':
        console.warn(output)
        break
      case 'error':
        console.error(output)
        break
    }

    // Файл (без ANSI цветов, всегда info+)
    if (LOG_LEVELS[level] >= LOG_LEVELS.info) {
      const metaStrPlain = formatMetaPlain(meta, truncate)
      const plainLine = `${timestamp} ${levelLabel} ${contextStrPlain}${message}${metaStrPlain}`
      writeToFile(plainLine)
    }
  }

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta, options) => log('error', message, meta, options?.full),
    child: (name) => createLogger([...context, name]),
  }
}

/**
 * Корневой логгер
 *
 * Использование:
 * ```typescript
 * import { logger } from '../utils/logger'
 *
 * // Создание дочернего логгера для модуля
 * const log = logger.child('TranscodeManager')
 *
 * log.info('Task started', { taskId: '123' })
 * log.error('Task failed', { error: 'Timeout' })
 * ```
 */
export const logger = createLogger([])

/**
 * Создаёт логгер для модуля (shortcut)
 *
 * @example
 * const log = createModuleLogger('FFmpeg')
 * log.info('Probe completed', { duration: 120.5 })
 */
export function createModuleLogger(moduleName: string): Logger {
  return logger.child(moduleName)
}

/**
 * Путь к текущему лог-файлу (для отображения в UI/настройках)
 */
export function getLogFilePath(): string | null {
  ensureFileLogger()
  return logFilePath
}
