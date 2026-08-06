/**
 * IPC handlers для работы с принтером
 * Использует SettingsService для получения имени принтера
 * Поддерживает retry с exponential backoff при ошибках
 */
import {
  createPrinterService,
  GS1Parser,
  ImageGeneratorService,
  type IPrinterService,
  Logger,
  retry,
  type RetryOptions,
  WindowsPrinterService,
} from '@letar/label-printer-core'
import { exec as execCb } from 'child_process'
import { ipcMain } from 'electron'
import { readdirSync, readFileSync } from 'fs'
import { promisify } from 'util'
import type { PrinterStatus, PrintResult, TemplateInfo } from '../../shared/types'
import { settingsService } from '../services/settings.service'
import { getTemplatesPath } from '../utils/paths'

const execAsync = promisify(execCb)

/**
 * Путь к Windows PowerShell 5.1 (.NET Framework).
 * PowerShell 7 (pwsh) не содержит System.Drawing.Printing — WMI-команды тоже лучше
 * запускать через 5.1 для единообразия.
 */
const WINDOWS_POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'

// Тестовый код маркировки с валидным GTIN-14 (контрольная сумма проверена)
const TEST_MARKING_CODE = '0104610000000007210000TEST123491TESTCRYPTO'

// Сервис принтера для тестовой печати (lazy init)
let testPrinterService: IPrinterService | null = null

/** Опции retry для тестовой печати */
const TEST_PRINT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 2,
  initialDelayMs: 500,
  maxDelayMs: 3000,
  backoffMultiplier: 2,
  jitter: true,
}

/**
 * Сбросить тестовый PrinterService (при изменении настроек)
 */
export function resetTestPrinterService(): void {
  if (testPrinterService) {
    testPrinterService.disconnect()
    testPrinterService = null
  }
}

/**
 * IPC handlers для работы с принтером
 */
export function registerPrinterHandlers(): void {
  const logger = Logger.getInstance()

  // Статус принтера
  ipcMain.handle('printer:status', async (): Promise<PrinterStatus> => {
    try {
      // Получаем имя принтера из настроек
      const configuredPrinterName = await settingsService.getPrinterName()
      const isMockMode = await settingsService.isMockMode()

      // В mock режиме возвращаем успешный статус
      if (isMockMode) {
        return {
          connected: true,
          name: configuredPrinterName,
          mode: 'MOCK',
        }
      }

      // Получаем список реальных принтеров из Windows
      const printers = await WindowsPrinterService.listPrinters()
      logger.debug('Available printers', { printers })

      // Ищем настроенный принтер
      const found = printers.find(
        (p) => p.name === configuredPrinterName || p.name.includes(configuredPrinterName.replace('_', ' ')),
      )

      if (found) {
        // Проверяем статус через Get-Printer
        const statusOk = !found.status || found.status === '0' || found.status.toLowerCase() === 'normal'

        // Дополнительная проверка через WMI — WorkOffline надёжнее для USB/сетевых принтеров
        let isOffline = false
        try {
          const escapedName = found.name.replace(/'/g, "''")
          const { stdout: wmiOut } = await execAsync(
            `"${WINDOWS_POWERSHELL}" -NonInteractive -Command "Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq '${escapedName}' } | Select-Object WorkOffline, PortName | ConvertTo-Json"`,
            { timeout: 5000 },
          )
          const wmiData = JSON.parse(wmiOut.trim())
          // Виртуальные принтеры (PORTPROMPT:, FILE:, NUL:) всегда доступны
          const port = (wmiData?.PortName || '').toUpperCase()
          const isVirtualPort = port.startsWith('PORTPROMPT') || port.startsWith('FILE') || port.startsWith('NUL')
          if (!isVirtualPort) {
            isOffline = wmiData?.WorkOffline === true
          }
          logger.debug('WMI printer check', {
            name: found.name,
            port,
            isVirtualPort,
            workOffline: wmiData?.WorkOffline,
          })
        } catch {
          // Если WMI не сработал, полагаемся на Get-Printer
          logger.debug('WMI WorkOffline check failed, using Get-Printer status only')
        }

        const isReady = statusOk && !isOffline
        return {
          connected: isReady,
          name: found.name,
          mode: 'REAL',
          error: isReady
            ? undefined
            : isOffline
            ? 'Принтер офлайн — проверьте подключение'
            : `Статус принтера: ${found.status}`,
        }
      } else {
        // Принтер не найден - показываем список доступных
        const availableNames = printers.map((p) => p.name).join(', ')
        return {
          connected: false,
          name: configuredPrinterName,
          mode: 'MOCK',
          error: printers.length > 0
            ? `Принтер "${configuredPrinterName}" не найден. Доступны: ${availableNames}`
            : 'Принтеры не найдены в системе',
        }
      }
    } catch (error) {
      const configuredPrinterName = await settingsService.getPrinterName()
      logger.error('Failed to get printer status', { error })
      return {
        connected: false,
        name: configuredPrinterName,
        mode: 'MOCK',
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Список принтеров
  ipcMain.handle('printer:list', async () => {
    try {
      const printers = await WindowsPrinterService.listPrinters()
      return printers.map((p, i) => ({
        name: p.name,
        displayName: p.name,
        isDefault: i === 0,
      }))
    } catch (error) {
      logger.error('[PrinterIPC]', 'printer:list error', error)
      return []
    }
  })

  // Тестовая печать с retry и общим таймаутом
  ipcMain.handle('printer:test', async (): Promise<PrintResult> => {
    // Общий таймаут 45 секунд (PowerShell печать может занять до 30 сек)
    const timeoutPromise = new Promise<PrintResult>((resolve) =>
      setTimeout(() => resolve({ success: false, error: 'Таймаут тестовой печати (45 сек)' }), 45000)
    )

    const printPromise = (async (): Promise<PrintResult> => {
      try {
        logger.info('Starting test print')

        // Парсим тестовый код маркировки
        const markingCode = GS1Parser.parse(TEST_MARKING_CODE)
        logger.info('Test code parsed', { gtin: markingCode.gtin })

        // Получаем конфигурации из настроек
        const printerConfig = await settingsService.getPrinterConfig()
        const labelConfig = await settingsService.getLabelConfig()
        logger.info('Settings loaded', { printerName: printerConfig.name, templatePath: labelConfig.templatePath })

        // Инициализируем сервис принтера (с allowDuplicates = true для теста)
        if (!testPrinterService) {
          logger.info('Creating test printer service...')
          testPrinterService = createPrinterService(printerConfig, labelConfig, { allowDuplicates: true })
          await testPrinterService.connect()
          logger.info('Test printer service connected')
        }

        // Читаем шаблон этикетки
        logger.info('Reading template...')
        const templateBuffer = readFileSync(labelConfig.templatePath)
        logger.info('Template read', { size: templateBuffer.length })

        // Генерируем изображение этикетки
        logger.info('Generating label image...')
        const imageBuffer = await ImageGeneratorService.generateLabelImage(
          templateBuffer,
          markingCode.fullCode,
          GS1Parser.extractGTIN13(markingCode.gtin),
          labelConfig,
        )
        logger.info('Label image generated', { size: imageBuffer.length })

        // Отправляем готовое изображение на печать через printDirect (без повторной генерации)
        logger.info('Sending to printer...')
        const retryResult = await retry(
          async () => {
            const result = testPrinterService!.printDirect
              ? await testPrinterService!.printDirect(imageBuffer)
              : await testPrinterService!.print(imageBuffer, markingCode)
            if (!result.success) {
              throw new Error(result.error || 'Test print failed')
            }
            return result
          },
          {
            ...TEST_PRINT_RETRY_OPTIONS,
            onRetry: (attempt, error, delayMs) => {
              logger.warn(`Test print retry attempt ${attempt}`, {
                error: error.message,
                delayMs,
              })
            },
          },
        )

        if (retryResult.success) {
          logger.info('Test print completed', {
            attempts: retryResult.attempts,
            totalTimeMs: retryResult.totalTimeMs,
          })
          return {
            success: true,
            message: `Тестовая этикетка напечатана${
              retryResult.attempts > 1 ? ` (попыток: ${retryResult.attempts})` : ''
            }`,
          }
        } else {
          logger.error('Test print failed after retries', {
            attempts: retryResult.attempts,
            error: retryResult.error?.message,
          })
          return {
            success: false,
            error: retryResult.error?.message || 'Ошибка тестовой печати',
          }
        }
      } catch (error) {
        logger.error('Test print failed', { error })
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    })()

    return Promise.race([printPromise, timeoutPromise])
  })

  // Список шаблонов
  ipcMain.handle('templates:list', async (): Promise<TemplateInfo[]> => {
    try {
      const templatesDir = getTemplatesPath()
      const files = readdirSync(templatesDir).filter((f) => f.endsWith('.png'))

      return files.map((f) => ({
        id: f.replace('.png', '').replace('label-template-', '').replace('label-template', 'default'),
        name: f.includes('muzkoi') ? 'Мужской' : 'Стандартный',
        path: f,
      }))
    } catch (error) {
      logger.error('[PrinterIPC]', 'templates:list error', error)
      return [
        { id: 'default', name: 'Стандартный', path: 'label-template.png' },
        { id: 'muzkoi', name: 'Мужской', path: 'label-template-muzkoi.png' },
      ]
    }
  })
}
