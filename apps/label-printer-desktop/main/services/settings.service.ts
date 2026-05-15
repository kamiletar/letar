/**
 * Сервис для работы с настройками приложения
 * Использует Next.js API (/api/model/settings) для доступа к SQLite БД
 *
 * Архитектура:
 * Main Process → HTTP → Next.js API → Prisma → SQLite
 */
import { type LabelConfig, Logger, type PrinterConfig } from '@letar/label-printer-core'
import { join } from 'path'
import { getApiBaseUrl } from '../background'
import { getTemplatesPath } from '../utils/paths'

/** Ленивое получение логгера (после инициализации в background.ts) */
const getLogger = () => Logger.getInstance()

/**
 * Режим печати этикетки
 */
export type LabelPrintMode = 'BITMAP' | 'NATIVE'

/**
 * Структура настроек приложения (соответствует model Settings в schema.zmodel)
 */
export interface SettingsData {
  id?: string
  printerName: string
  printerMode: 'MOCK' | 'REAL'
  labelPrintMode: LabelPrintMode
  printerSpeed: number
  printerDensity: number
  copies: number
  templateId: string | null
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
  // Сканер
  scannerPort: string | null
  scannerBaudRate: number
  scannerEnabled: boolean
}

/**
 * Дефолтные настройки (соответствуют schema.zmodel)
 */
const DEFAULT_SETTINGS: SettingsData = {
  id: 'default',
  printerName: 'TSC TE300',
  printerMode: 'REAL',
  labelPrintMode: 'BITMAP',
  printerSpeed: 4,
  printerDensity: 8,
  copies: 1,
  templateId: null,
  datamatrixX: 26,
  datamatrixY: 160,
  datamatrixSize: 160,
  gtinX: 526,
  gtinY: 10,
  gtinWidth: 140,
  gtinHeight: 440,
  allowDuplicates: false,
  autoReconnect: true,
  retryAttempts: 3,
  autoUpdate: false,
  // Сканер (по умолчанию COM5 для MINDEO)
  scannerPort: 'COM5',
  scannerBaudRate: 9600,
  scannerEnabled: true,
}

/**
 * Сервис управления настройками приложения через API
 */
export class SettingsService {
  private cache: SettingsData | null = null
  private cacheExpiry = 0
  private readonly CACHE_TTL_MS = 5000 // Кэш на 5 секунд

  /**
   * Получить настройки приложения через API
   * Использует кэширование для уменьшения запросов
   */
  async getSettings(): Promise<SettingsData> {
    // Проверяем кэш
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache
    }

    try {
      const baseUrl = getApiBaseUrl()
      const url = `${baseUrl}/api/model/settings/findFirst`
      getLogger().debug('[SettingsService] GET', { url })

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const errorBody = await response.text()
        getLogger().warn('[SettingsService] API returned non-OK status, using defaults', {
          status: response.status,
          body: errorBody,
        })
        return this.ensureDefaults()
      }

      const result = await response.json()

      // ZenStack API возвращает { data: {...} }
      const data = result.data || result

      if (!data || !data.printerName) {
        getLogger().debug('[SettingsService] No settings in DB, creating defaults')
        return this.ensureDefaults()
      }

      // Конвертируем enum'ы из строк
      const settings: SettingsData = {
        ...DEFAULT_SETTINGS,
        ...data,
        printerMode: data.printerMode || 'REAL',
        labelPrintMode: data.labelPrintMode || 'BITMAP',
      }

      // Обновляем кэш
      this.cache = settings
      this.cacheExpiry = Date.now() + this.CACHE_TTL_MS

      return settings
    } catch (error) {
      getLogger().error('[SettingsService] Failed to fetch settings from API:', error)
      // Fallback на дефолты при ошибке сети
      return DEFAULT_SETTINGS
    }
  }

  /**
   * Создать дефолтные настройки в БД если их нет
   */
  private async ensureDefaults(): Promise<SettingsData> {
    try {
      const baseUrl = getApiBaseUrl()

      // Не включаем id — Prisma сгенерирует cuid() автоматически
      const { id: _id, ...settingsWithoutId } = DEFAULT_SETTINGS

      const createBody = JSON.stringify({ data: settingsWithoutId })
      getLogger().debug('[SettingsService] POST create body:', createBody)

      const response = await fetch(`${baseUrl}/api/model/settings/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: createBody,
      })

      if (response.ok) {
        const result = await response.json()
        const settings = result.data || result
        this.cache = { ...DEFAULT_SETTINGS, ...settings }
        this.cacheExpiry = Date.now() + this.CACHE_TTL_MS
        getLogger().info('[SettingsService] Created default settings in DB')
        return this.cache
      } else {
        const errorText = await response.text()
        getLogger().warn('[SettingsService] Failed to create defaults:', { status: response.status, body: errorText })
      }
    } catch (error) {
      getLogger().error('[SettingsService] Failed to create defaults:', error)
    }

    return DEFAULT_SETTINGS
  }

  /**
   * Сохранить настройки через API
   */
  async saveSettings(data: SettingsData): Promise<void> {
    try {
      const baseUrl = getApiBaseUrl()
      const updateBody = JSON.stringify({
        where: { id: data.id || 'default' },
        data: {
          printerName: data.printerName,
          printerMode: data.printerMode,
          labelPrintMode: data.labelPrintMode,
          printerSpeed: data.printerSpeed,
          printerDensity: data.printerDensity,
          copies: data.copies,
          templateId: data.templateId,
          datamatrixX: data.datamatrixX,
          datamatrixY: data.datamatrixY,
          datamatrixSize: data.datamatrixSize,
          gtinX: data.gtinX,
          gtinY: data.gtinY,
          gtinWidth: data.gtinWidth,
          gtinHeight: data.gtinHeight,
          allowDuplicates: data.allowDuplicates,
          autoReconnect: data.autoReconnect,
          retryAttempts: data.retryAttempts,
          autoUpdate: data.autoUpdate,
          // Сканер
          scannerPort: data.scannerPort,
          scannerBaudRate: data.scannerBaudRate,
          scannerEnabled: data.scannerEnabled,
        },
      })
      getLogger().debug('[SettingsService] PUT update body:', updateBody)

      const response = await fetch(`${baseUrl}/api/model/settings/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: updateBody,
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`API returned ${response.status}: ${errorBody}`)
      }

      // Инвалидируем кэш
      this.invalidateCache()
      getLogger().debug('[SettingsService] Settings saved via API')
    } catch (error) {
      getLogger().error('[SettingsService] Failed to save settings:', error)
      throw error
    }
  }

  /**
   * Обновить настройки (частичное обновление)
   */
  async updateSettings(data: Partial<SettingsData>): Promise<SettingsData> {
    const current = await this.getSettings()
    const updated = { ...current, ...data }
    await this.saveSettings(updated)
    return updated
  }

  /**
   * Конвертировать Settings в PrinterConfig для @letar/label-printer-core
   */
  async getPrinterConfig(): Promise<PrinterConfig> {
    const s = await this.getSettings()

    return {
      name: s.printerName,
      mode: s.printerMode === 'MOCK' ? 'mock' : 'real',
      connection: {
        type: 'windows',
        path: s.printerName,
        baudRate: 9600,
      },
      settings: {
        speed: s.printerSpeed,
        density: s.printerDensity,
        width: 58,
        height: 40,
        dpi: 300,
        gap: 3,
        orientation: 0,
        copies: s.copies,
      },
    }
  }

  /**
   * Конвертировать Settings в LabelConfig для @letar/label-printer-core
   */
  async getLabelConfig(): Promise<LabelConfig> {
    const s = await this.getSettings()

    // Путь к шаблону
    const templatePath = join(getTemplatesPath(), 'label-template.png')

    return {
      templatePath,
      width: 685,
      height: 461,
      dpi: 300,
      elements: {
        datamatrix: {
          enabled: true,
          x: s.datamatrixX,
          y: s.datamatrixY,
          size: s.datamatrixSize,
          moduleSize: 4,
          eclevel: 'M',
        },
        gtin: {
          enabled: true,
          type: 'ean13',
          x: s.gtinX,
          y: s.gtinY,
          width: s.gtinWidth,
          height: s.gtinHeight,
          includeText: true,
          fontSize: 10,
          textPosition: 'bottom',
        },
      },
    }
  }

  /**
   * Получить имя принтера из настроек
   */
  async getPrinterName(): Promise<string> {
    const s = await this.getSettings()
    return s.printerName
  }

  /**
   * Проверить, включен ли режим эмуляции
   */
  async isMockMode(): Promise<boolean> {
    const s = await this.getSettings()
    return s.printerMode === 'MOCK'
  }

  /**
   * Проверить, разрешены ли дубликаты
   */
  async isAllowDuplicates(): Promise<boolean> {
    const s = await this.getSettings()
    return s.allowDuplicates
  }

  /**
   * Получить режим печати этикетки (BITMAP или NATIVE)
   */
  async getLabelPrintMode(): Promise<LabelPrintMode> {
    const s = await this.getSettings()
    return s.labelPrintMode || 'BITMAP'
  }

  /**
   * Получить конфигурацию сканера
   */
  async getScannerConfig(): Promise<{ port: string; baudRate: number; enabled: boolean }> {
    const s = await this.getSettings()
    return {
      port: s.scannerPort || '',
      baudRate: s.scannerBaudRate || 9600,
      enabled: s.scannerEnabled ?? true,
    }
  }

  /**
   * Сбросить кэш
   */
  invalidateCache(): void {
    this.cache = null
    this.cacheExpiry = 0
  }
}

// Синглтон для использования во всём приложении
export const settingsService = new SettingsService()
