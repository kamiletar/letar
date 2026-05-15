/**
 * @letar/contract-generator
 *
 * Библиотека для генерации договоров автошколы
 *
 * Возможности:
 * - Шаблоны договоров с Handlebars-плейсхолдерами
 * - Подстановка данных ученика и школы
 * - Генерация PDF для печати (только на сервере!)
 * - Справочник всех доступных плейсхолдеров
 *
 * @example
 * ```typescript
 * // Клиентский код (работа с шаблонами)
 * import {
 *   renderTemplate,
 *   extractPlaceholders,
 *   createTestData,
 *   PLACEHOLDERS,
 * } from '@letar/contract-generator'
 *
 * // РЕКОМЕНДУЕТСЯ: @react-pdf/renderer (лёгкий, быстрый)
 * import { ContractPDF } from '@/lib/pdf'
 * import { generatePdfFromReact } from '@letar/contract-generator/pdf-react'
 *
 * const data: TemplateData = { student, school, contract }
 * const pdf = await generatePdfFromReact(<ContractPDF data={data} />)
 *
 * // Legacy: Puppeteer (для сложного HTML)
 * import { generatePdf, wrapHtmlForPrint } from '@letar/contract-generator/pdf-generator'
 *
 * const { html } = renderTemplate(template, data)
 * const printableHtml = wrapHtmlForPrint(html, `Договор №${contract.number}`)
 * const pdf = await generatePdf(printableHtml)
 * ```
 */

// Типы (безопасны везде)
export type {
  ContractData,
  PassportData,
  PlaceholderInfo,
  RenderResult,
  RepresentativeData,
  SchoolData,
  StudentData,
  TemplateData,
} from './types'

// Рендерер шаблонов (безопасен везде - не использует Node.js API)
export {
  PLACEHOLDERS,
  createTestData,
  extractPlaceholders,
  getGroupedPlaceholders,
  renderTemplate,
  validateTemplateData,
} from './template-renderer'

// Шаблон по умолчанию (безопасен везде - просто строка)
export { createDefaultTrainingContractTemplate } from './default-template'

// ============================================================================
// СЕРВЕРНЫЕ ФУНКЦИИ ДЛЯ ГЕНЕРАЦИИ PDF
// ============================================================================
//
// Есть ДВА способа генерации PDF:
//
// 1. @react-pdf/renderer (РЕКОМЕНДУЕТСЯ)
//    - Лёгкий: ~100-150MB RAM vs ~1GB у Puppeteer
//    - Быстрый: 0.5-1s vs 3-5s у Puppeteer
//    - Маленький bundle: +1MB vs +56MB у Puppeteer
//
// ```ts
// import { ContractPDF } from '@/lib/pdf'
// import { generatePdfFromReact } from '@letar/contract-generator/pdf-react'
//
// const pdf = await generatePdfFromReact(<ContractPDF data={data} />)
// ```
//
// 2. Puppeteer (legacy, для сложного HTML)
//    - Поддержка полного CSS/HTML
//    - Тяжёлый, медленный, большой bundle
//
// ```ts
// import { generatePdf, wrapHtmlForPrint } from '@letar/contract-generator/pdf-generator'
//
// const html = wrapHtmlForPrint(renderedHtml, 'Договор')
// const pdf = await generatePdf(html)
// ```
//
// ⚠️ ВНИМАНИЕ: Обе функции работают только на сервере!
// Импортируй их только в Server Components, API Routes или Server Actions.
//
// Доступные типы:
// - PdfOptions, PdfResult (из pdf-generator или pdf-react)
// - TemplateData (из основного экспорта)
//
