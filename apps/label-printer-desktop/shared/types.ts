/**
 * Общие типы для IPC между main и renderer процессами
 * Единый источник истины — избегаем дублирования
 */

// === История печати ===

/**
 * Задание печати (запись в истории)
 */
export interface PrintJob {
  id: string
  fullCode: string
  gtin: string
  serialNumber: string
  cryptoCode?: string
  scanCount: number
  printed: boolean
  firstScannedAt: string
  lastScannedAt: string
}

/**
 * Данные истории печати
 */
export interface HistoryData {
  jobs: PrintJob[]
}

/**
 * Параметры экспорта истории
 */
export interface ExportHistoryParams {
  startDate?: string
  endDate?: string
}

/**
 * Результат экспорта файла
 */
export interface ExportResult {
  success: boolean
  filePath?: string
  error?: string
}

// === IPC Response типы ===

/**
 * Результат операции печати
 */
export interface PrintResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * Статистика заданий печати
 */
export interface PrintJobStats {
  totalPrinted: number
  todayPrinted: number
  duplicatesBlocked: number
  lastPrintTime?: Date
}

/**
 * Статус принтера
 */
export interface PrinterStatus {
  connected: boolean
  name: string
  mode: 'REAL' | 'MOCK'
  error?: string
}

/**
 * Информация о принтере в списке
 */
export interface PrinterInfo {
  name: string
  displayName: string
  isDefault: boolean
}

/**
 * Информация о шаблоне этикетки
 */
export interface TemplateInfo {
  id: string
  name: string
  path: string
}

/**
 * Распарсенный код маркировки
 */
export interface ParsedMarkingCode {
  fullCode: string
  gtin: string
  gtin13: string // Для отображения (EAN-13)
  serialNumber: string
  cryptoCode: string
  additionalData?: string
}

/**
 * Тип ошибки валидации
 */
export type ValidationErrorType = 'FORMAT' | 'GTIN' | 'UNKNOWN'

/**
 * Результат валидации кода маркировки
 */
export interface ValidationResult {
  isValid: boolean
  code?: ParsedMarkingCode
  error?: {
    type: ValidationErrorType
    message: string
    details?: string
  }
}

// === Профили принтеров ===

/**
 * Профиль принтера — сохранённые настройки для быстрого переключения
 */
export interface PrinterProfile {
  id: string
  name: string
  printerName: string
  printerSpeed: number
  printerDensity: number
  copies: number
  templateId: string
  datamatrixX: number
  datamatrixY: number
  datamatrixSize: number
  gtinX: number
  gtinY: number
  gtinWidth: number
  gtinHeight: number
  createdAt: string
  updatedAt: string
}

// === AppSettings ===
// Определяем явно, т.к. Prisma не работает в Electron main process (webpack issues)
// Структура соответствует schema.zmodel
export type LabelPrintMode = 'BITMAP' | 'NATIVE'

export interface AppSettings {
  id?: string
  printerName: string
  printerMode: 'MOCK' | 'REAL'
  labelPrintMode: LabelPrintMode
  printerSpeed: number
  printerDensity: number
  copies: number
  templateId: string
  datamatrixX: number
  datamatrixY: number
  datamatrixSize: number
  gtinX: number
  gtinY: number
  gtinWidth: number
  gtinHeight: number
  allowDuplicates: boolean
  autoReconnect: boolean
  retryAttempts: number
  autoUpdate: boolean
  updatedAt?: Date
}
