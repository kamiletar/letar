import { type ChildProcess, exec } from 'child_process'
import * as fs from 'fs'
import type { Buffer } from 'node:buffer'
import * as os from 'os'
import * as path from 'path'
import type { LabelConfig, PrinterConfig } from '../config/config.schema'
import type { MarkingCode } from '../models/marking-code.model'
import type { PrinterStatus, PrintResult } from '../models/print-job.model'
import { PrinterState } from '../models/print-job.model'
import { Logger } from '../utils/logger'
import { ImageGeneratorService } from './image-generator.service'
import { TSPLService } from './tspl.service'

/**
 * Путь к Windows PowerShell 5.1 (.NET Framework).
 * ВАЖНО: нельзя использовать просто 'powershell' — на машинах с PowerShell 7 (pwsh)
 * команда 'powershell' может резолвиться в PS7, где нет System.Drawing и WMI cmdlet'ов.
 */
const WINDOWS_POWERSHELL = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'

/**
 * Активные дочерние процессы PowerShell — убиваются при cleanup.
 * Все команды PowerShell используют фиксированные пути/параметры без пользовательского ввода,
 * поэтому exec безопасен от injection.
 */
const activeChildProcesses = new Set<ChildProcess>()

/**
 * Обёртка exec с трекингом дочерних процессов для корректного cleanup
 */
function trackedExec(
  command: string,
  options: { shell?: string; timeout?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = exec(command, options, (error, stdout, stderr) => {
      activeChildProcesses.delete(child)
      if (error) {
        reject(error)
      } else {
        resolve({ stdout: stdout?.toString() ?? '', stderr: stderr?.toString() ?? '' })
      }
    })
    activeChildProcesses.add(child)
  })
}

/**
 * Убить все активные дочерние процессы PowerShell.
 * Вызывается при закрытии приложения из background.ts.
 */
export function killAllChildProcesses(): void {
  for (const child of activeChildProcesses) {
    try {
      child.kill('SIGTERM')
    } catch {
      // Процесс уже завершён
    }
  }
  activeChildProcesses.clear()
}

/**
 * Найти путь к PowerShell скрипту
 */
function findPrintScript(scriptName: string): string | null {
  // Electron-специфичный путь (resourcesPath есть только в Electron)
  const electronResourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath

  const scriptPaths = [
    path.join(__dirname, scriptName),
    path.join(__dirname, '..', '..', scriptName),
    // Electron dev: __dirname = apps/label-printer-desktop/app/, скрипт в ../main/scripts/
    path.join(__dirname, '..', 'main', 'scripts', scriptName),
    path.join(process.cwd(), 'dist', 'apps', 'label-printer', scriptName),
    path.join(process.cwd(), 'apps', 'label-printer', 'src', 'app', 'commands', scriptName),
    // Для Electron (label-printer-desktop)
    path.join(process.cwd(), 'resources', 'scripts', scriptName),
    path.join(process.cwd(), 'main', 'scripts', scriptName),
    path.join(process.cwd(), 'apps', 'label-printer-desktop', 'main', 'scripts', scriptName),
    // Electron production: extraResources копирует в корень resources/
    electronResourcesPath ? path.join(electronResourcesPath, scriptName) : '',
    electronResourcesPath ? path.join(electronResourcesPath, 'scripts', scriptName) : '',
  ].filter(Boolean)

  return scriptPaths.find((p) => fs.existsSync(p)) || null
}

/**
 * Windows printer service - works with installed Windows printers
 */
export class WindowsPrinterService {
  private outputDir: string
  private logger = Logger.getInstance()
  private printerName: string
  private labelConfig: LabelConfig
  private printerConfig: PrinterConfig

  constructor(
    printerConfig: PrinterConfig,
    labelConfig: LabelConfig,
    _behaviorConfig: { retryAttempts: number; retryDelay: number; autoReconnectPrinter: boolean }
  ) {
    this.printerConfig = printerConfig
    this.labelConfig = labelConfig
    this.printerName = printerConfig.name

    // Determine output directory for debug copies
    const builtOutputPath = path.join(__dirname, '..', '..', 'output')
    const sourceOutputPath = path.join(process.cwd(), 'apps', 'label-printer', 'output')

    if (fs.existsSync(path.join(__dirname, '..', '..', 'config'))) {
      this.outputDir = builtOutputPath
    } else if (fs.existsSync(path.join(process.cwd(), 'apps', 'label-printer', 'config'))) {
      this.outputDir = sourceOutputPath
    } else {
      this.outputDir = path.join(process.cwd(), 'output')
    }

    // Ensure output directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }
  }

  /**
   * Connect to printer (check if printer exists)
   */
  async connect(): Promise<void> {
    try {
      const printers = await this.listPrintersPS()
      const found = printers.find((p) => p.name === this.printerName || p.name.includes(this.printerName))

      if (!found) {
        this.logger.error('Printer not found in Windows', {
          requestedName: this.printerName,
          availablePrinters: printers.map((p) => p.name),
        })
        throw new Error(
          `Printer "${this.printerName}" not found. Available printers: ${printers.map((p) => p.name).join(', ')}`
        )
      }

      this.logger.info('Windows printer found', { name: found.name, port: found.port })
      this.printerName = found.name // Use exact name
    } catch (error) {
      this.logger.error('Failed to connect to Windows printer', { error })
      throw error
    }
  }

  /**
   * List printers using PowerShell
   */
  private async listPrintersPS(): Promise<Array<{ name: string; status?: string; port?: string }>> {
    try {
      const { stdout } = await trackedExec(
        `"${WINDOWS_POWERSHELL}" -NonInteractive -Command "Get-Printer | Select-Object Name, PrinterStatus, PortName | ConvertTo-Json"`,
        { timeout: 10000 }
      )
      const printers = JSON.parse(stdout)
      if (Array.isArray(printers)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PowerShell JSON вывод не типизирован
        return printers.map((p: any) => ({ name: p.Name, status: p.PrinterStatus, port: p.PortName }))
      } else if (printers.Name) {
        return [{ name: printers.Name, status: printers.PrinterStatus, port: printers.PortName }]
      }
      return []
    } catch (error) {
      this.logger.error('Failed to list printers via PowerShell', { error })
      return []
    }
  }

  /**
   * Check printer status
   */
  async checkStatus(): Promise<PrinterStatus> {
    try {
      const printers = await this.listPrintersPS()
      const found = printers.find((p) => p.name === this.printerName)

      if (!found) {
        return {
          ready: false,
          status: PrinterState.NOT_FOUND,
          message: 'Printer not found',
        }
      }

      // Check printer status (0 = Normal/Ready, other = error/offline)
      if (found.status && found.status !== '0' && found.status.toLowerCase() !== 'normal') {
        return {
          ready: false,
          status: PrinterState.ERROR,
          message: `Printer status: ${found.status}`,
        }
      }

      return {
        ready: true,
        status: PrinterState.READY,
      }
    } catch (error) {
      this.logger.error('Status check failed', { error })
      return {
        ready: false,
        status: PrinterState.ERROR,
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Отправить бинарные данные на принтер через winspool.drv (print-raw.ps1)
   * PNG → TSPL BITMAP (бинарный) → temp файл → RAW печать
   */
  private async sendRawToWinspool(imageBuffer: Buffer): Promise<void> {
    // 1. Генерируем бинарный TSPL print job
    const rawData = await TSPLService.generateBinaryPrintJob(imageBuffer, this.printerConfig)
    this.logger.info('Binary TSPL job generated', { size: rawData.length })

    // 2. Находим скрипт print-raw.ps1
    const scriptPath = findPrintScript('print-raw.ps1')
    if (!scriptPath) {
      throw new Error('print-raw.ps1 script not found')
    }

    // 3. Записываем бинарные данные во временный файл
    const tempFile = path.join(os.tmpdir(), `tspl_raw_${Date.now()}.bin`)
    fs.writeFileSync(tempFile, rawData)
    this.logger.debug('TSPL binary saved', { path: tempFile, size: rawData.length })

    try {
      // 4. Отправляем через winspool.drv
      const psCommand = `"${WINDOWS_POWERSHELL}" -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" -PrinterName "${this.printerName}" -FilePath "${tempFile}"`
      const { stdout, stderr } = await trackedExec(psCommand, { shell: 'cmd.exe', timeout: 30000 })

      if (!stdout || !stdout.includes('SUCCESS')) {
        const error = stderr || stdout || 'RAW print failed'
        throw new Error(error)
      }
    } finally {
      // 5. Удаляем временный файл
      try {
        fs.unlinkSync(tempFile)
      } catch {
        // Игнорируем ошибку удаления
      }
    }
  }

  /**
   * Печать этикетки — генерация PNG + RAW TSPL через winspool.drv
   */
  async print(labelBuffer: Buffer, markingCode: MarkingCode): Promise<PrintResult> {
    try {
      this.logger.info('Generating label image with codes (RAW TSPL method)...')

      // Загружаем шаблон если настроен
      let templateBuffer: Buffer | null = null
      if (this.labelConfig.templatePath && fs.existsSync(this.labelConfig.templatePath)) {
        this.logger.info('Loading template image', { path: this.labelConfig.templatePath })
        templateBuffer = fs.readFileSync(this.labelConfig.templatePath)
      } else {
        this.logger.info('No template configured, using white background')
      }

      // Генерируем финальное изображение этикетки с кодами
      const finalImage = await ImageGeneratorService.generateLabelImage(
        templateBuffer,
        markingCode.fullCode,
        markingCode.gtin,
        this.labelConfig
      )

      // Сохраняем для отладки
      const filename = `label_${Date.now()}.png`
      const finalImagePath = path.join(this.outputDir, filename)
      fs.writeFileSync(finalImagePath, finalImage)
      this.logger.info('Final label image saved', { path: finalImagePath })

      // Отправляем RAW TSPL через winspool.drv
      this.logger.info('Sending RAW TSPL to printer via winspool.drv...', { printer: this.printerName })
      await this.sendRawToWinspool(finalImage)

      this.logger.info('Print job sent successfully')
      return {
        success: true,
        jobId: Date.now(),
      }
    } catch (error) {
      this.logger.error('Print failed', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Печать готового PNG изображения без перегенерации
   * Используется при печати из предпросмотра (renderer → print:printImage)
   */
  async printDirect(imageBuffer: Buffer): Promise<PrintResult> {
    try {
      this.logger.info('Printing pre-rendered image directly via RAW TSPL...')

      // Сохраняем готовое изображение для отладки
      const filename = `label_direct_${Date.now()}.png`
      const finalImagePath = path.join(this.outputDir, filename)
      fs.writeFileSync(finalImagePath, imageBuffer)
      this.logger.info('Direct image saved', { path: finalImagePath })

      // Отправляем RAW TSPL через winspool.drv
      this.logger.info('Sending direct image via winspool.drv...', { printer: this.printerName })
      await this.sendRawToWinspool(imageBuffer)

      this.logger.info('Direct print job sent successfully')
      return { success: true, jobId: Date.now() }
    } catch (error) {
      this.logger.error('Direct print failed', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Печать RAW данных (TSPL команды) напрямую на принтер
   * ЭКСПЕРИМЕНТАЛЬНЫЙ МЕТОД — качество может быть хуже чем BITMAP
   */
  async printRaw(tsplCommands: string): Promise<PrintResult> {
    try {
      this.logger.info('Sending RAW TSPL commands to printer (EXPERIMENTAL)...', {
        printer: this.printerName,
        commandLength: tsplCommands.length,
      })

      // Находим скрипт print-raw.ps1
      const scriptPath = findPrintScript('print-raw.ps1')
      if (!scriptPath) {
        throw new Error('print-raw.ps1 script not found')
      }

      // Сохраняем TSPL команды во временный файл
      const tempFile = path.join(this.outputDir, `tspl_${Date.now()}.txt`)
      fs.writeFileSync(tempFile, tsplCommands, 'utf-8')
      this.logger.info('TSPL commands saved', { path: tempFile })

      // Показываем команды для отладки
      this.logger.debug('TSPL commands preview:', { commands: tsplCommands.substring(0, 500) })

      // Отправляем RAW данные через PowerShell
      const psCommand = `"${WINDOWS_POWERSHELL}" -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" -PrinterName "${this.printerName}" -FilePath "${tempFile}"`
      const { stdout, stderr } = await trackedExec(psCommand, { shell: 'cmd.exe' })

      // Удаляем временный файл
      try {
        fs.unlinkSync(tempFile)
      } catch {
        // Игнорируем ошибку удаления
      }

      if (stdout && stdout.includes('SUCCESS')) {
        this.logger.info('RAW print job sent successfully')
        return { success: true, jobId: Date.now() }
      } else {
        const error = stderr || stdout || 'RAW print failed'
        this.logger.error('RAW print failed', { output: stdout, error: stderr })
        throw new Error(error)
      }
    } catch (error) {
      this.logger.error('RAW print failed', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * Disconnect from printer
   */
  disconnect(): void {
    this.logger.info('Windows printer disconnected')
  }

  /**
   * List all available Windows printers (static method)
   */
  static async listPrinters(): Promise<Array<{ name: string; status?: string; isDefault?: boolean }>> {
    try {
      const { stdout } = await trackedExec(
        `"${WINDOWS_POWERSHELL}" -NonInteractive -Command "Get-Printer | Select-Object Name, PrinterStatus, @{Name='IsDefault';Expression={$_.Default}} | ConvertTo-Json"`,
        { timeout: 10000 }
      )
      const printers = JSON.parse(stdout)
      if (Array.isArray(printers)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- PowerShell JSON вывод не типизирован
        return printers.map((p: any) => ({
          name: p.Name,
          status: p.PrinterStatus?.toString(),
          isDefault: p.IsDefault === true,
        }))
      } else if (printers.Name) {
        return [
          {
            name: printers.Name,
            status: printers.PrinterStatus?.toString(),
            isDefault: printers.IsDefault === true,
          },
        ]
      }
      return []
    } catch (_error) {
      return []
    }
  }
}
