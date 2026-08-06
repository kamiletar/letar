import * as fs from 'fs'
import * as path from 'path'
import type { LabelConfig, PrinterConfig } from '../config/config.schema'
import type { MarkingCode } from '../models/marking-code.model'
import type { PrinterStatus, PrintResult } from '../models/print-job.model'
import { PrinterState } from '../models/print-job.model'
import { Logger } from '../utils/logger'
import { WindowsPrinterService } from './printer.service.windows'

/**
 * Mock printer service - saves labels to file instead of printing
 */
export class MockPrinterService {
  private outputDir: string
  private logger = Logger.getInstance()

  constructor() {
    // Determine output directory relative to app root
    const builtOutputPath = path.join(__dirname, '..', '..', 'output')
    const sourceOutputPath = path.join(process.cwd(), 'apps', 'label-printer', 'output')

    if (fs.existsSync(path.join(__dirname, '..', '..', 'config'))) {
      this.outputDir = builtOutputPath
    } else if (fs.existsSync(path.join(process.cwd(), 'apps', 'label-printer', 'config'))) {
      this.outputDir = sourceOutputPath
    } else {
      this.outputDir = path.join(process.cwd(), 'output')
    }

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true })
    }

    this.logger.info('Mock printer initialized', { outputDir: this.outputDir })
  }

  async connect(): Promise<void> {
    this.logger.info('Mock printer: connect (no-op)')
  }

  async checkStatus(): Promise<PrinterStatus> {
    return {
      ready: true,
      status: PrinterState.READY,
      message: 'Mock printer always ready',
    }
  }

  async print(labelBuffer: Buffer, markingCode: MarkingCode): Promise<PrintResult> {
    try {
      const filename = `label_${Date.now()}.png`
      const outputPath = path.join(this.outputDir, filename)
      fs.writeFileSync(outputPath, labelBuffer)

      this.logger.info('Mock printer: label saved to file', { path: outputPath, gtin: markingCode.gtin })

      return {
        success: true,
        jobId: Date.now(),
      }
    } catch (error) {
      this.logger.error('Mock printer: failed to save label', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  async printDirect(imageBuffer: Buffer): Promise<PrintResult> {
    try {
      const filename = `label_direct_${Date.now()}.png`
      const outputPath = path.join(this.outputDir, filename)
      fs.writeFileSync(outputPath, imageBuffer)

      this.logger.info('Mock printer: direct image saved to file', { path: outputPath })

      return { success: true, jobId: Date.now() }
    } catch (error) {
      this.logger.error('Mock printer: failed to save direct image', { error })
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  disconnect(): void {
    this.logger.info('Mock printer: disconnect (no-op)')
  }
}

/**
 * Printer service interface
 */
export interface IPrinterService {
  connect(): Promise<void>
  checkStatus(): Promise<PrinterStatus>
  print(labelBuffer: Buffer, markingCode: MarkingCode): Promise<PrintResult>
  /** Печать готового PNG без перегенерации (для предпросмотра → печать) */
  printDirect?(imageBuffer: Buffer): Promise<PrintResult>
  /** RAW печать TSPL команд (ЭКСПЕРИМЕНТАЛЬНЫЙ, только для WindowsPrinterService) */
  printRaw?(tsplCommands: string): Promise<PrintResult>
  disconnect(): void
}

/**
 * Factory function to create appropriate printer service based on configuration
 * Поддерживает только 'windows' (Windows API) и 'mock' режимы
 * Serial port поддержка удалена для совместимости с Electron
 */
export function createPrinterService(
  config: PrinterConfig,
  labelConfig: LabelConfig,
  behaviorConfig: { retryAttempts: number; retryDelay: number; autoReconnectPrinter: boolean },
): IPrinterService {
  const logger = Logger.getInstance()

  if (config.mode === 'real') {
    // Всегда используем Windows API для реальной печати
    logger.info('Creating Windows printer service', { name: config.name })
    return new WindowsPrinterService(config, labelConfig, behaviorConfig)
  } else {
    logger.info('Creating mock printer service')
    return new MockPrinterService()
  }
}

/**
 * Default export for backward compatibility
 */
export class PrinterService extends MockPrinterService {}
