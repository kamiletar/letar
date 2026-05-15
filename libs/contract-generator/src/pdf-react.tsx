/**
 * Генерация PDF договоров через @react-pdf/renderer
 *
 * Лёгкая альтернатива Puppeteer:
 * - RAM: ~100-150MB (vs ~1GB у Puppeteer)
 * - Bundle: +1MB (vs +56MB у Puppeteer)
 * - Скорость: 0.5-1s (vs 3-5s у Puppeteer)
 */

import type { PdfOptions, PdfResult } from './pdf-generator'

/**
 * Генерирует PDF из React компонента
 *
 * @param element - React элемент PDF документа (Document из @react-pdf/renderer)
 * @param options - Опции генерации
 * @returns Promise с PDF буфером
 *
 * @example
 * ```typescript
 * import { ContractPDF } from '@/lib/pdf'
 * import { generatePdfFromReact } from '@letar/contract-generator/pdf-react'
 *
 * const data: TemplateData = { student, school, contract }
 * const pdf = await generatePdfFromReact(<ContractPDF data={data} />)
 * await fs.writeFile('contract.pdf', pdf.buffer)
 * ```
 */
export async function generatePdfFromReact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: any,
  _options?: PdfOptions
): Promise<PdfResult> {
  // Динамический импорт @react-pdf/renderer для tree-shaking
  const { renderToBuffer } = await import('@react-pdf/renderer')

  const buffer = await renderToBuffer(element)

  return {
    buffer: Buffer.from(buffer),
    size: buffer.byteLength,
    mimeType: 'application/pdf',
  }
}

/**
 * Генерирует PDF в stream для больших документов
 *
 * @param element - React элемент PDF документа
 * @returns ReadableStream с PDF данными
 */
export async function generatePdfStreamFromReact(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  element: any
): Promise<NodeJS.ReadableStream> {
  const { renderToStream } = await import('@react-pdf/renderer')
  return renderToStream(element)
}

// Re-export типов для удобства
export type { PdfOptions, PdfResult } from './pdf-generator'
export type { TemplateData } from './types'
