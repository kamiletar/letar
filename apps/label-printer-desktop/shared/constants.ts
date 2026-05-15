/**
 * Константы приложения Label Printer Desktop
 * Устраняет magic numbers и дублирование констант
 */

/** Размеры этикетки по умолчанию (в пикселях) */
export const LABEL_DIMENSIONS = {
  width: 685,
  height: 461,
} as const

/** Время жизни кеша (в миллисекундах) */
export const CACHE_TTL_MS = 5000

/** Размер страницы для пагинации */
export const PAGE_SIZE = 20

/** Задержка переподключения сканера (в миллисекундах) */
export const SCANNER_RECONNECT_DELAY_MS = 5000

/** Имя принтера по умолчанию */
export const DEFAULT_PRINTER_NAME = 'TSC_TE300'

/** Начальный порт для поиска свободного порта */
export const DEFAULT_START_PORT = 5000

/** Максимальное количество попыток поиска порта */
export const MAX_PORT_ATTEMPTS = 100

/** Задержка проверки обновлений при запуске (в миллисекундах) */
export const UPDATE_CHECK_DELAY_MS = 5000

/** Настройки serial порта по умолчанию */
export const DEFAULT_SERIAL_OPTIONS = {
  baudRate: 115200,
  dataBits: 8,
  parity: 'none' as const,
  stopBits: 1,
}

/** Настройки retry для печати */
export const PRINT_RETRY_OPTIONS = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 3000,
  backoffMultiplier: 2,
}

/** Размеры окна приложения */
export const WINDOW_DIMENSIONS = {
  main: { width: 1200, height: 800 },
  splash: { width: 400, height: 320 },
}

/** Порты приложений по умолчанию */
export const APP_PORTS = {
  renderer: 5000,
  api: 3456,
}

/** Имена файлов хранилища */
export const STORAGE_FILES = {
  history: 'history.json',
  profiles: 'profiles.json',
  settings: 'settings.json',
}

/** Типы маркировки */
export const MARKING_TYPES = {
  /** Честный знак */
  HONEST_SIGN: 'honest_sign',
  /** EAN-13 */
  EAN13: 'ean13',
  /** Custom */
  CUSTOM: 'custom',
} as const

export type MarkingType = (typeof MARKING_TYPES)[keyof typeof MARKING_TYPES]
