/**
 * IPC handlers для печати этикеток
 * Использует SettingsService для загрузки конфигурации
 * Поддерживает retry с exponential backoff при ошибках принтера
 *
 * Печать через BITMAP — генерация PNG в renderer, печать через Windows GDI
 */
import {
  BarcodeService,
  createPrinterService,
  GS1Parser,
  ImageGeneratorService,
  InvalidCodeFormatError,
  InvalidGTINError,
  type IPrinterService,
  Logger,
  retry,
  type RetryOptions,
} from '@letar/label-printer-core'
import type { IpcMainInvokeEvent } from 'electron'
import { ipcMain } from 'electron'
import { readFileSync } from 'fs'
import type { ValidationResult } from '../../shared/types'
import { settingsService } from '../services/settings.service'

/** Ленивое получение логгера (после инициализации в background.ts) */
const getLogger = () => Logger.getInstance()

/** Опции retry для печати */
const PRINT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
  onRetry: (attempt, error, delayMs) => {
    getLogger().warn(`Retry print attempt ${attempt}`, {
      error: error.message,
      delayMs,
    })
  },
}

// Сервисы инициализируются лениво
let printerService: IPrinterService | null = null

/**
 * Инициализировать PrinterService с актуальными настройками
 */
async function initPrinterService(): Promise<IPrinterService> {
  if (!printerService) {
    const printerConfig = await settingsService.getPrinterConfig()
    const labelConfig = await settingsService.getLabelConfig()
    const allowDuplicates = await settingsService.isAllowDuplicates()

    printerService = createPrinterService(printerConfig, labelConfig, { allowDuplicates })
    await printerService.connect()
  }
  return printerService
}

/**
 * Сбросить PrinterService (при изменении настроек)
 */
export function resetPrinterService(): void {
  if (printerService) {
    printerService.disconnect()
    printerService = null
  }
}

/**
 * IPC handlers для печати этикеток
 */
export function registerPrintHandlers(): void {
  // Валидация кода маркировки
  ipcMain.handle('print:validate', async (_event: IpcMainInvokeEvent, code: string): Promise<ValidationResult> => {
    try {
      const parsed = GS1Parser.parse(code)
      return {
        isValid: true,
        code: {
          fullCode: parsed.fullCode,
          gtin: parsed.gtin,
          gtin13: GS1Parser.extractGTIN13(parsed.gtin),
          serialNumber: parsed.serialNumber,
          cryptoCode: parsed.cryptoCode,
          additionalData: parsed.additionalData,
        },
      }
    } catch (error) {
      if (error instanceof InvalidGTINError) {
        return {
          isValid: false,
          error: {
            type: 'GTIN',
            message: 'Неверный GTIN',
            details: error.message,
          },
        }
      }
      if (error instanceof InvalidCodeFormatError) {
        return {
          isValid: false,
          error: {
            type: 'FORMAT',
            message: 'Неверный формат кода',
            details: error.message,
          },
        }
      }
      return {
        isValid: false,
        error: {
          type: 'UNKNOWN',
          message: 'Ошибка валидации',
          details: error instanceof Error ? error.message : String(error),
        },
      }
    }
  })

  // Печать этикетки с retry при ошибках принтера
  ipcMain.handle('print:execute', async (_event: IpcMainInvokeEvent, code: string) => {
    try {
      // Парсим код маркировки (без retry — ошибки валидации не временные)
      const markingCode = GS1Parser.parse(code)

      // Получаем сервис принтера
      const printer = await initPrinterService()
      const labelConfig = await settingsService.getLabelConfig()

      // BITMAP режим — генерация PNG, печать через Windows GDI
      const templateBuffer = readFileSync(labelConfig.templatePath)

      // Генерируем изображение этикетки (без retry — CPU-bound операция)
      const imageBuffer = await ImageGeneratorService.generateLabelImage(
        templateBuffer,
        markingCode.fullCode,
        GS1Parser.extractGTIN13(markingCode.gtin),
        labelConfig
      )

      // Отправляем готовое изображение на печать (без повторной генерации)
      const retryResult = await retry(async () => {
        const result = printer.printDirect
          ? await printer.printDirect(imageBuffer)
          : await printer.print(imageBuffer, markingCode)
        if (!result.success) {
          throw new Error(result.error || 'Print failed')
        }
        return result
      }, PRINT_RETRY_OPTIONS)

      if (retryResult.success && retryResult.data) {
        getLogger().info('Print succeeded', {
          gtin: markingCode.gtin,
          attempts: retryResult.attempts,
          totalTimeMs: retryResult.totalTimeMs,
        })
        return {
          success: true,
          message: `Этикетка напечатана: ${markingCode.gtin}`,
          attempts: retryResult.attempts,
        }
      } else {
        getLogger().error('Print failed after retries', {
          gtin: markingCode.gtin,
          attempts: retryResult.attempts,
          error: retryResult.error?.message,
        })
        return {
          success: false,
          error: retryResult.error?.message || 'Ошибка печати',
          attempts: retryResult.attempts,
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Генерация баркодов (DataMatrix + GTIN) для предпросмотра в renderer
  ipcMain.handle('print:generateBarcodes', async (_event: IpcMainInvokeEvent, code: string) => {
    try {
      // Парсим код маркировки
      const markingCode = GS1Parser.parse(code)
      const gtin13 = GS1Parser.extractGTIN13(markingCode.gtin)

      // Получаем конфигурацию
      const labelConfig = await settingsService.getLabelConfig()

      // Генерируем DataMatrix и GTIN barcode (поворот делается через CSS в браузере)
      const [dataMatrixBuffer, gtinBarcodeBuffer] = await Promise.all([
        BarcodeService.generateDataMatrix(markingCode.fullCode, labelConfig),
        BarcodeService.generateGTINBarcode(markingCode.gtin, labelConfig),
      ])

      return {
        dataMatrixBase64: `data:image/png;base64,${dataMatrixBuffer.toString('base64')}`,
        gtinBarcodeBase64: `data:image/png;base64,${gtinBarcodeBuffer.toString('base64')}`,
        gtin13,
        labelWidth: labelConfig.width,
        labelHeight: labelConfig.height,
      }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  })

  // Печать готового PNG изображения этикетки (из предпросмотра)
  ipcMain.handle('print:printImage', async (_event: IpcMainInvokeEvent, base64Png: string) => {
    try {
      // Получаем сервис принтера
      const printer = await initPrinterService()

      // Конвертируем base64 в Buffer
      const imageBuffer = Buffer.from(base64Png, 'base64')

      // DEBUG: Сохраняем PNG для отладки
      const debugPath = `C:\\web\\lena\\debug_label_${Date.now()}.png`
      require('fs').writeFileSync(debugPath, imageBuffer)
      getLogger().info('DEBUG: Saved label image', { path: debugPath, size: imageBuffer.length })

      // Используем printDirect — печать готового изображения без перегенерации
      let result
      if (printer.printDirect) {
        result = await printer.printDirect(imageBuffer)
      } else {
        // Fallback для MockPrinterService без printDirect
        const dummyCode = { gtin: 'preview', fullCode: '', serialNumber: '', cryptoCode: '', additionalData: {} }
        result = await printer.print(imageBuffer, dummyCode)
      }

      if (result.success) {
        getLogger().info('Print image succeeded')
        return { success: true, message: 'Этикетка напечатана' }
      } else {
        return { success: false, error: result.error || 'Ошибка печати' }
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })
}
