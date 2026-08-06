/**
 * Типы для Electron API, доступного через preload.ts
 * Реэкспорт из shared/types — единый источник истины
 */

// Реэкспорт типов из shared
export type {
  AppSettings,
  ParsedMarkingCode,
  PrinterInfo,
  PrinterProfile,
  PrinterStatus,
  PrintJobStats,
  PrintResult,
  TemplateInfo,
  ValidationResult,
} from '../../shared/types'

// Импорт для использования в ElectronAPI интерфейсе
import type {
  AppSettings,
  PrinterInfo,
  PrinterProfile,
  PrinterStatus,
  PrintJobStats,
  PrintResult,
  TemplateInfo,
  ValidationResult,
} from '../../shared/types'

/**
 * Результат экспорта
 */
export interface ExportResult {
  success: boolean
  filePath?: string
  error?: string
}

/**
 * Параметры экспорта с диапазоном дат
 */
export interface ExportParams {
  startDate?: string
  endDate?: string
}

/**
 * Статистика печати по дням (для графика)
 */
export interface DailyStats {
  date: string
  printed: number
  scanned: number
}

/**
 * Статистика за период (для сравнения)
 */
export interface PeriodStats {
  totalPrinted: number
  totalScanned: number
  duplicatesBlocked: number
  daysCount: number
}

/**
 * Статус обновления приложения
 */
export interface UpdateStatus {
  checking: boolean
  available: boolean
  downloaded: boolean
  error: string | null
  version: string | null
  progress: number | null
}

/**
 * Статус сканера штрих-кодов
 */
export interface ScannerStatus {
  connected: boolean
  port: string | null
  mode: 'COM' | 'USB_HID'
}

/**
 * Результат парсинга PDF
 */
export interface PDFParseResult {
  codes: string[]
  totalPages: number
  foundCount: number
  errors: Array<{ page: number; error: string }>
}

/**
 * Ответ на парсинг PDF
 */
export interface PDFParseResponse {
  success: boolean
  data?: PDFParseResult
  error?: string
}

/**
 * API Electron, доступный через window.electronAPI
 */
/**
 * Результат генерации баркодов
 */
export interface BarcodeData {
  dataMatrixBase64: string
  gtinBarcodeBase64: string
  gtin13: string
  labelWidth: number
  labelHeight: number
}

export interface ElectronAPI {
  print: {
    validate: (code: string) => Promise<ValidationResult>
    execute: (code: string) => Promise<PrintResult>
    generateBarcodes: (code: string) => Promise<BarcodeData>
    printImage: (base64Png: string) => Promise<PrintResult>
  }
  database: {
    getHistory: (limit?: number, offset?: number) => Promise<unknown[]>
    getStats: () => Promise<PrintJobStats>
    getDailyStats: (days?: number) => Promise<DailyStats[]>
    deleteJobs: (ids: string[]) => Promise<{ success: boolean; deletedCount?: number; error?: string }>
    getStatsForPeriod: (startDate: string, endDate: string) => Promise<PeriodStats>
    clearHistory: () => Promise<boolean>
  }
  printer: {
    getStatus: () => Promise<PrinterStatus>
    list: () => Promise<PrinterInfo[]>
    testPrint: () => Promise<PrintResult>
  }
  templates: {
    list: () => Promise<TemplateInfo[]>
  }
  profiles: {
    list: () => Promise<PrinterProfile[]>
    get: (id: string) => Promise<PrinterProfile | null>
    create: (
      profile: Omit<PrinterProfile, 'id' | 'createdAt' | 'updatedAt'>,
    ) => Promise<{ success: boolean; profile?: PrinterProfile; error?: string }>
    update: (
      id: string,
      updates: Partial<PrinterProfile>,
    ) => Promise<{ success: boolean; profile?: PrinterProfile; error?: string }>
    delete: (id: string) => Promise<{ success: boolean; error?: string }>
  }
  settings: {
    get: () => Promise<AppSettings>
    save: (settings: Partial<AppSettings>) => Promise<{ success: boolean; error?: string }>
  }
  export: {
    historyToExcel: (params?: ExportParams) => Promise<ExportResult>
    statsToPdf: (params?: ExportParams) => Promise<ExportResult>
  }
  scanner: {
    listPorts: () => Promise<string[]>
    getStatus: () => Promise<ScannerStatus>
    reconnect: () => Promise<boolean>
    disconnect: () => Promise<boolean>
  }
  pdf: {
    parse: (filePath: string) => Promise<PDFParseResponse>
    parseBase64: (base64: string) => Promise<PDFParseResponse>
  }
  updater: {
    getVersion: () => Promise<string>
    check: () => Promise<{ success: boolean; updateAvailable?: boolean; version?: string; error?: string }>
    download: () => Promise<{ success: boolean; error?: string }>
    install: () => Promise<{ success: boolean }>
    getStatus: () => Promise<UpdateStatus>
  }
  on: {
    scannerInput: (callback: (code: string) => void) => () => void
    printerStatus: (callback: (status: PrinterStatus) => void) => () => void
    updateStatus: (callback: (status: UpdateStatus) => void) => () => void
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
