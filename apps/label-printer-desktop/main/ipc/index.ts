import { registerConfigHandlers } from './config.handlers'
import { registerDatabaseHandlers } from './database.handlers'
import { registerExportHandlers } from './export.handlers'
import { registerPDFHandlers } from './pdf.handlers'
import { registerPrintHandlers } from './print.handlers'
import { registerPrinterHandlers } from './printer.handlers'
import { registerProfilesHandlers } from './profiles.handlers'
import { registerScannerHandlers } from './scanner.handlers'
import { registerSettingsHandlers } from './settings.handlers'

/**
 * Регистрирует все IPC handlers
 */
export function registerIpcHandlers(): void {
  registerPrintHandlers()
  registerDatabaseHandlers()
  registerPrinterHandlers()
  registerConfigHandlers()
  registerSettingsHandlers()
  registerExportHandlers()
  registerProfilesHandlers()
  registerPDFHandlers()
  registerScannerHandlers()
}
