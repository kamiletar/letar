/**
 * PDF Parser Service
 *
 * Извлекает DataMatrix коды из PDF документов:
 * 1. Рендерит страницы PDF в изображения
 * 2. Сканирует изображения на наличие DataMatrix кодов
 * 3. Возвращает найденные коды маркировки
 *
 * Используется для пакетной печати этикеток из PDF файлов
 * с кодами "Честный знак"
 */

import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from '@zxing/library'
import type { GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist'
import { GS1Parser } from './gs1-parser'

/** Результат парсинга PDF */
export interface PDFParseResult {
  /** Успешно извлечённые коды */
  codes: string[]
  /** Количество страниц в PDF */
  totalPages: number
  /** Количество найденных кодов */
  foundCount: number
  /** Ошибки при парсинге (по страницам) */
  errors: Array<{ page: number; error: string }>
}

/** Опции парсинга */
export interface PDFParseOptions {
  /** Масштаб рендеринга (по умолчанию 2.0 для лучшего распознавания) */
  scale?: number
  /** Максимальное количество страниц для обработки (по умолчанию все) */
  maxPages?: number
  /** Фильтровать только валидные GS1 коды (по умолчанию true) */
  validateGS1?: boolean
  /** Callback для отслеживания прогресса */
  onProgress?: (current: number, total: number) => void
}

const DEFAULT_OPTIONS: Required<Omit<PDFParseOptions, 'onProgress'>> = {
  scale: 2.0,
  maxPages: Infinity,
  validateGS1: true,
}

/**
 * Создаёт BinaryBitmap из RGBA данных изображения
 */
function createBinaryBitmap(imageData: { data: Uint8ClampedArray; width: number; height: number }): BinaryBitmap {
  // Конвертируем RGBA в grayscale
  const { data, width, height } = imageData
  const grayscale = new Uint8ClampedArray(width * height)

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    // Стандартная формула grayscale
    grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
  }

  const luminanceSource = new RGBLuminanceSource(grayscale, width, height)
  return new BinaryBitmap(new HybridBinarizer(luminanceSource))
}

/**
 * Сканирует изображение на наличие DataMatrix кодов
 */
function scanForDataMatrix(imageData: { data: Uint8ClampedArray; width: number; height: number }): string[] {
  const results: string[] = []

  try {
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.DATA_MATRIX])
    hints.set(DecodeHintType.TRY_HARDER, true)

    const reader = new MultiFormatReader()
    reader.setHints(hints)

    const bitmap = createBinaryBitmap(imageData)
    const result = reader.decode(bitmap)

    if (result) {
      results.push(result.getText())
    }
  } catch {
    // Код не найден на изображении — это нормально
  }

  return results
}

/**
 * Рендерит страницу PDF в данные изображения
 * Работает только в Electron main process с canvas модулем
 */
async function renderPageToImageData(
  pdfDoc: PDFDocumentProxy,
  pageNum: number,
  scale: number
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({ scale })

  // Для Node.js используем canvas модуль
  const { createCanvas } = await import('canvas')
  const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height))
  const ctx = canvas.getContext('2d')

  // pdfjs требует специальный контекст
  // canvas module CanvasRenderingContext2D несовместим с DOM типом, но pdfjs работает
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx, viewport } as any).promise

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

  return {
    data: new Uint8ClampedArray(imageData.data),
    width: canvas.width,
    height: canvas.height,
  }
}

/**
 * Парсит PDF файл и извлекает DataMatrix коды
 *
 * @example
 * ```typescript
 * const buffer = readFileSync('codes.pdf')
 * const result = await parsePDF(buffer)
 * console.log('Found codes:', result.codes)
 * ```
 */
export async function parsePDF(pdfBuffer: Buffer | Uint8Array, options: PDFParseOptions = {}): Promise<PDFParseResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const codes: string[] = []
  const errors: Array<{ page: number; error: string }> = []

  // Динамически импортируем pdfjs-dist
  const pdfjs = await import('pdfjs-dist')

  // Настраиваем worker (отключаем для серверного окружения)
  const pdfjsWorker = pdfjs as unknown as { GlobalWorkerOptions: typeof GlobalWorkerOptions }
  pdfjsWorker.GlobalWorkerOptions.workerSrc = ''

  // Загружаем PDF
  const loadingTask = pdfjs.getDocument({
    data: pdfBuffer,
    useSystemFonts: true,
    disableFontFace: true,
  })

  const pdfDoc = await loadingTask.promise
  const totalPages = Math.min(pdfDoc.numPages, opts.maxPages)

  // Обрабатываем каждую страницу
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    try {
      opts.onProgress?.(pageNum, totalPages)

      // Рендерим страницу в изображение
      const imageData = await renderPageToImageData(pdfDoc, pageNum, opts.scale)

      // Сканируем на DataMatrix
      const foundCodes = scanForDataMatrix(imageData)

      for (const code of foundCodes) {
        // Фильтруем по валидности GS1 если нужно
        if (opts.validateGS1) {
          try {
            GS1Parser.parse(code)
            codes.push(code)
          } catch {
            // Невалидный GS1 код — пропускаем
          }
        } else {
          codes.push(code)
        }
      }
    } catch (error) {
      errors.push({
        page: pageNum,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return {
    codes,
    totalPages,
    foundCount: codes.length,
    errors,
  }
}

/**
 * Парсит PDF из base64 строки
 */
export async function parsePDFFromBase64(base64: string, options: PDFParseOptions = {}): Promise<PDFParseResult> {
  const buffer = Buffer.from(base64, 'base64')
  return parsePDF(buffer, options)
}

/**
 * Проверяет, является ли файл PDF
 */
export function isPDFFile(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf')
}

/**
 * Проверяет PDF сигнатуру в буфере
 */
export function isPDFBuffer(buffer: Buffer | Uint8Array): boolean {
  // PDF начинается с %PDF-
  return (
    buffer.length >= 5 &&
    buffer[0] === 0x25 && // %
    buffer[1] === 0x50 && // P
    buffer[2] === 0x44 && // D
    buffer[3] === 0x46 && // F
    buffer[4] === 0x2d // -
  )
}
