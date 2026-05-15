/**
 * IPC handlers для работы с PDF файлами
 * Извлечение DataMatrix кодов из PDF документов
 */
import { isPDFBuffer, Logger, parsePDF, type PDFParseResult } from '@letar/label-printer-core'
import { ipcMain } from 'electron'
import { readFileSync } from 'fs'

/** Ленивое получение логгера (после инициализации в background.ts) */
const getLogger = () => Logger.getInstance()

/** Результат парсинга PDF для renderer */
export interface PDFParseResponse {
  success: boolean
  data?: PDFParseResult
  error?: string
}

/**
 * Регистрирует IPC handlers для работы с PDF
 */
export function registerPDFHandlers(): void {
  // Парсинг PDF файла по пути
  ipcMain.handle('pdf:parse', async (_event, filePath: string): Promise<PDFParseResponse> => {
    try {
      getLogger().info('Parsing PDF file', { filePath })

      // Читаем файл
      const buffer = readFileSync(filePath)

      // Проверяем, что это PDF
      if (!isPDFBuffer(buffer)) {
        return {
          success: false,
          error: 'Файл не является PDF документом',
        }
      }

      // Парсим PDF
      const result = await parsePDF(buffer, {
        scale: 2.0,
        validateGS1: true,
      })

      getLogger().info('PDF parsed successfully', {
        totalPages: result.totalPages,
        foundCodes: result.foundCount,
        errors: result.errors.length,
      })

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      getLogger().error('PDF parsing failed', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  // Парсинг PDF из base64
  ipcMain.handle('pdf:parseBase64', async (_event, base64: string): Promise<PDFParseResponse> => {
    try {
      getLogger().info('Parsing PDF from base64')

      // Декодируем base64
      const buffer = Buffer.from(base64, 'base64')

      // Проверяем, что это PDF
      if (!isPDFBuffer(buffer)) {
        return {
          success: false,
          error: 'Данные не являются PDF документом',
        }
      }

      // Парсим PDF
      const result = await parsePDF(buffer, {
        scale: 2.0,
        validateGS1: true,
      })

      getLogger().info('PDF parsed successfully from base64', {
        totalPages: result.totalPages,
        foundCodes: result.foundCount,
      })

      return {
        success: true,
        data: result,
      }
    } catch (error) {
      getLogger().error('PDF parsing from base64 failed', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })
}
