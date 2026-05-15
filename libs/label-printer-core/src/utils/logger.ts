import * as path from 'path'
import * as winston from 'winston'
import type { LoggingConfig } from '../config/config.schema'

/**
 * Logger utility using Winston
 */
export class Logger {
  private static logger: winston.Logger | null = null

  /**
   * Initialize logger with configuration
   */
  static initialize(config: LoggingConfig): winston.Logger {
    if (Logger.logger) {
      return Logger.logger
    }

    const transports: winston.transport[] = []

    // Console transport
    if (config.console) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf((info) => {
              const { timestamp, level, message, ...meta } = info
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
              return `[${timestamp}] ${level}: ${message}${metaStr}`
            })
          ),
        })
      )
    }

    // File transport
    if (config.file) {
      const logsDir = path.join(process.cwd(), 'logs')

      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: parseSize(config.maxSize),
          maxFiles: config.maxFiles,
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        })
      )

      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          maxsize: parseSize(config.maxSize),
          maxFiles: config.maxFiles,
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        })
      )
    }

    Logger.logger = winston.createLogger({
      level: config.level,
      transports,
    })

    return Logger.logger
  }

  /**
   * Get logger instance
   */
  static getInstance(): winston.Logger {
    if (!Logger.logger) {
      throw new Error('Logger not initialized. Call Logger.initialize() first.')
    }
    return Logger.logger
  }
}

/**
 * Parse size string (e.g., '10m', '1g') to bytes
 */
function parseSize(sizeStr: string): number {
  const units: Record<string, number> = {
    b: 1,
    k: 1024,
    m: 1024 * 1024,
    g: 1024 * 1024 * 1024,
  }

  const match = sizeStr.toLowerCase().match(/^(\d+)([bkmg])$/)
  if (!match) {
    return 10 * 1024 * 1024 // Default 10MB
  }

  const [, num, unit] = match
  return parseInt(num, 10) * units[unit]
}
