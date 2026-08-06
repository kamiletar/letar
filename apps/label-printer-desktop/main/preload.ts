import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  PrinterInfo,
  PrinterProfile,
  PrinterStatus,
  PrintJobStats,
  PrintResult,
  TemplateInfo,
  ValidationResult,
} from '../shared/types'

// Реэкспорт типов для использования в других модулях
export type {
  AppSettings,
  PrinterInfo,
  PrinterProfile,
  PrinterStatus,
  PrintJobStats,
  PrintResult,
  TemplateInfo,
  ValidationResult,
}

/**
 * API, доступный в renderer process через window.electronAPI
 */
const electronAPI = {
  // === Печать ===
  print: {
    /** Валидация кода маркировки (парсинг + проверка) */
    validate: (code: string): Promise<ValidationResult> => ipcRenderer.invoke('print:validate', code),

    /** Напечатать этикетку по коду */
    execute: (code: string): Promise<PrintResult> => ipcRenderer.invoke('print:execute', code),

    /** Генерация баркодов для предпросмотра в renderer */
    generateBarcodes: (
      code: string,
    ): Promise<{
      dataMatrixBase64: string
      gtinBarcodeBase64: string
      gtin13: string
      labelWidth: number
      labelHeight: number
    }> => ipcRenderer.invoke('print:generateBarcodes', code),

    /** Печать готового PNG изображения */
    printImage: (base64Png: string): Promise<PrintResult> => ipcRenderer.invoke('print:printImage', base64Png),
  },

  // === База данных ===
  database: {
    /** Получить историю печати */
    getHistory: (limit?: number, offset?: number): Promise<unknown[]> =>
      ipcRenderer.invoke('database:history', { limit, offset }),

    /** Получить статистику */
    getStats: (): Promise<PrintJobStats> => ipcRenderer.invoke('database:stats'),

    /** Получить статистику по дням (для графика) */
    getDailyStats: (days?: number): Promise<Array<{ date: string; printed: number; scanned: number }>> =>
      ipcRenderer.invoke('database:dailyStats', { days: days ?? 7 }),

    /** Удалить записи по ID (bulk delete) */
    deleteJobs: (ids: string[]): Promise<{ success: boolean; deletedCount?: number; error?: string }> =>
      ipcRenderer.invoke('database:deleteJobs', ids),

    /** Получить статистику за период (для сравнения) */
    getStatsForPeriod: (
      startDate: string,
      endDate: string,
    ): Promise<{ totalPrinted: number; totalScanned: number; duplicatesBlocked: number; daysCount: number }> =>
      ipcRenderer.invoke('database:statsForPeriod', { startDate, endDate }),

    /** Очистить историю */
    clearHistory: (): Promise<boolean> => ipcRenderer.invoke('database:clear'),
  },

  // === Принтер ===
  printer: {
    /** Получить статус принтера */
    getStatus: (): Promise<PrinterStatus> => ipcRenderer.invoke('printer:status'),

    /** Получить список доступных принтеров */
    list: (): Promise<PrinterInfo[]> => ipcRenderer.invoke('printer:list'),

    /** Тестовая печать */
    testPrint: (): Promise<PrintResult> => ipcRenderer.invoke('printer:test'),
  },

  // === Шаблоны ===
  templates: {
    /** Список доступных шаблонов */
    list: (): Promise<TemplateInfo[]> => ipcRenderer.invoke('templates:list'),
  },

  // === Профили принтеров ===
  profiles: {
    /** Получить список профилей */
    list: (): Promise<PrinterProfile[]> => ipcRenderer.invoke('profiles:list'),

    /** Получить профиль по ID */
    get: (id: string): Promise<PrinterProfile | null> => ipcRenderer.invoke('profiles:get', id),

    /** Создать профиль */
    create: (
      profile: Omit<PrinterProfile, 'id' | 'createdAt' | 'updatedAt'>,
    ): Promise<{ success: boolean; profile?: PrinterProfile; error?: string }> =>
      ipcRenderer.invoke('profiles:create', profile),

    /** Обновить профиль */
    update: (
      id: string,
      updates: Partial<PrinterProfile>,
    ): Promise<{ success: boolean; profile?: PrinterProfile; error?: string }> =>
      ipcRenderer.invoke('profiles:update', id, updates),

    /** Удалить профиль */
    delete: (id: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('profiles:delete', id),
  },

  // === Настройки ===
  settings: {
    /** Получить настройки */
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),

    /** Сохранить настройки */
    save: (settings: Partial<AppSettings>): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('settings:save', settings),
  },

  // === Экспорт ===
  export: {
    /** Экспорт истории в Excel */
    historyToExcel: (params?: {
      startDate?: string
      endDate?: string
    }): Promise<{ success: boolean; filePath?: string; error?: string }> =>
      ipcRenderer.invoke('export:history-excel', params ?? {}),

    /** Экспорт статистики в PDF */
    statsToPdf: (params?: {
      startDate?: string
      endDate?: string
    }): Promise<{ success: boolean; filePath?: string; error?: string }> =>
      ipcRenderer.invoke('export:stats-pdf', params ?? {}),
  },

  // === Сканер ===
  scanner: {
    /** Получить список доступных COM-портов */
    listPorts: (): Promise<string[]> => ipcRenderer.invoke('scanner:list-ports'),

    /** Получить текущий статус сканера */
    getStatus: (): Promise<{ connected: boolean; port: string | null; mode: 'COM' | 'USB_HID' }> =>
      ipcRenderer.invoke('scanner:status'),

    /** Переподключить сканер с текущими настройками */
    reconnect: (): Promise<boolean> => ipcRenderer.invoke('scanner:reconnect'),

    /** Отключить сканер */
    disconnect: (): Promise<boolean> => ipcRenderer.invoke('scanner:disconnect'),
  },

  // === PDF парсинг ===
  pdf: {
    /** Парсить PDF файл и извлечь DataMatrix коды */
    parse: (
      filePath: string,
    ): Promise<{
      success: boolean
      data?: {
        codes: string[]
        totalPages: number
        foundCount: number
        errors: Array<{ page: number; error: string }>
      }
      error?: string
    }> => ipcRenderer.invoke('pdf:parse', filePath),

    /** Парсить PDF из base64 */
    parseBase64: (
      base64: string,
    ): Promise<{
      success: boolean
      data?: {
        codes: string[]
        totalPages: number
        foundCount: number
        errors: Array<{ page: number; error: string }>
      }
      error?: string
    }> => ipcRenderer.invoke('pdf:parseBase64', base64),
  },

  // === Обновления ===
  updater: {
    /** Получить текущую версию приложения */
    getVersion: (): Promise<string> => ipcRenderer.invoke('updater:version'),

    /** Проверить наличие обновлений */
    check: (): Promise<{ success: boolean; updateAvailable?: boolean; version?: string; error?: string }> =>
      ipcRenderer.invoke('updater:check'),

    /** Скачать обновление */
    download: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('updater:download'),

    /** Установить обновление (перезапуск приложения) */
    install: (): Promise<{ success: boolean }> => ipcRenderer.invoke('updater:install'),

    /** Получить текущий статус обновления */
    getStatus: (): Promise<{
      checking: boolean
      available: boolean
      downloaded: boolean
      error: string | null
      version: string | null
      progress: number | null
    }> => ipcRenderer.invoke('updater:status'),
  },

  // === События ===
  on: {
    /** Подписка на события сканера */
    scannerInput: (callback: (code: string) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, code: string) => callback(code)
      ipcRenderer.on('scanner:input', handler)
      return () => ipcRenderer.removeListener('scanner:input', handler)
    },

    /** Подписка на изменение статуса принтера */
    printerStatus: (callback: (status: PrinterStatus) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, status: PrinterStatus) => callback(status)
      ipcRenderer.on('printer:statusChanged', handler)
      return () => ipcRenderer.removeListener('printer:statusChanged', handler)
    },

    /** Подписка на статус обновления */
    updateStatus: (
      callback: (status: {
        checking: boolean
        available: boolean
        downloaded: boolean
        error: string | null
        version: string | null
        progress: number | null
      }) => void,
    ) => {
      const handler = (
        _event: Electron.IpcRendererEvent,
        status: {
          checking: boolean
          available: boolean
          downloaded: boolean
          error: string | null
          version: string | null
          progress: number | null
        },
      ) => callback(status)
      ipcRenderer.on('update-status', handler)
      return () => ipcRenderer.removeListener('update-status', handler)
    },
  },
}

// Экспортируем API в renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Типы для TypeScript в renderer
export type ElectronAPI = typeof electronAPI
