/**
 * Минимальный логгер без зависимости от Electron — библиотека не может опираться на
 * `apps/animatrona/main/utils/logger.ts` (использует `electron.app` для пути к лог-файлу),
 * а будущему `animatrona-player` файловый логгер вообще не нужен.
 */

/** Интерфейс логгера, достаточный для сервисов folder-scan */
export interface ModuleLogger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

function log(
  level: 'debug' | 'info' | 'warn' | 'error',
  context: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
  const line = `[${context}] ${message}${metaStr}`
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

/** Создаёт логгер для модуля (консольный вывод, без файловой ротации) */
export function createModuleLogger(context: string): ModuleLogger {
  return {
    debug: (message, meta) => log('debug', context, message, meta),
    info: (message, meta) => log('info', context, message, meta),
    warn: (message, meta) => log('warn', context, message, meta),
    error: (message, meta) => log('error', context, message, meta),
  }
}
