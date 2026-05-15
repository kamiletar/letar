/**
 * Генерация PDF договоров
 *
 * Использует @react-pdf/renderer для генерации PDF из React-компонентов
 */

import type { TemplateData } from './types'

/**
 * Опции генерации PDF
 */
export interface PdfOptions {
  /** Размер страницы */
  pageSize?: 'A4' | 'A5' | 'LETTER'
  /** Ориентация */
  orientation?: 'portrait' | 'landscape'
  /** Отступы страницы */
  margins?: {
    top?: number
    bottom?: number
    left?: number
    right?: number
  }
  /** Название документа */
  title?: string
  /** Автор документа */
  author?: string
}

/**
 * Результат генерации PDF
 */
export interface PdfResult {
  /** PDF как Buffer */
  buffer: Buffer
  /** Размер в байтах */
  size: number
  /** MIME тип */
  mimeType: 'application/pdf'
}

/**
 * CSS стили для PDF документа
 */
export const PDF_STYLES = `
  @page {
    size: A4;
    margin: 20mm;
  }

  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 12pt;
    line-height: 1.5;
    color: #000;
  }

  h1 {
    font-size: 16pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 20pt;
  }

  h2 {
    font-size: 14pt;
    font-weight: bold;
    margin-top: 16pt;
    margin-bottom: 8pt;
  }

  p {
    text-align: justify;
    text-indent: 1.25cm;
    margin-bottom: 8pt;
  }

  .contract-header {
    text-align: center;
    margin-bottom: 20pt;
  }

  .contract-date-city {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16pt;
  }

  .contract-parties {
    margin-bottom: 20pt;
  }

  .contract-section {
    margin-bottom: 16pt;
  }

  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 40pt;
    page-break-inside: avoid;
  }

  .signature-block {
    width: 45%;
  }

  .signature-line {
    border-bottom: 1px solid #000;
    margin-top: 40pt;
    margin-bottom: 4pt;
  }

  .signature-label {
    font-size: 10pt;
    text-align: center;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16pt 0;
  }

  td, th {
    border: 1px solid #000;
    padding: 8pt;
    text-align: left;
  }

  .requisites {
    font-size: 10pt;
    line-height: 1.3;
  }

  .requisites table {
    border: none;
  }

  .requisites td {
    border: none;
    padding: 2pt 4pt;
    vertical-align: top;
  }
`

/**
 * Оборачивает HTML контент в полный HTML документ для печати
 */
export function wrapHtmlForPrint(htmlContent: string, title?: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${title || 'Договор'}</title>
  <style>${PDF_STYLES}</style>
</head>
<body>
  ${htmlContent}
</body>
</html>`
}

/**
 * Создаёт блок подписей для конца договора
 */
export function createSignatureBlock(data: TemplateData): string {
  return `
<div class="signatures">
  <div class="signature-block">
    <h3>ИСПОЛНИТЕЛЬ:</h3>
    <div class="requisites">
      <p><strong>${data.school.fullName}</strong></p>
      <table>
        <tr><td>ИНН:</td><td>${data.school.inn}</td></tr>
        <tr><td>ОГРН:</td><td>${data.school.ogrn}</td></tr>
        <tr><td>КПП:</td><td>${data.school.kpp}</td></tr>
        <tr><td>Адрес:</td><td>${data.school.legalAddress}</td></tr>
        <tr><td>Телефон:</td><td>${data.school.phone || ''}</td></tr>
        <tr><td>Email:</td><td>${data.school.email || ''}</td></tr>
      </table>
      <p><strong>Банковские реквизиты:</strong></p>
      <table>
        <tr><td>Банк:</td><td>${data.school.bankName}</td></tr>
        <tr><td>Р/с:</td><td>${data.school.bankAccount}</td></tr>
        <tr><td>К/с:</td><td>${data.school.corrAccount}</td></tr>
        <tr><td>БИК:</td><td>${data.school.bankBik}</td></tr>
      </table>
      <div class="signature-line"></div>
      <p class="signature-label">${data.school.directorPosition} / ${data.school.directorName}</p>
    </div>
  </div>

  <div class="signature-block">
    <h3>ЗАКАЗЧИК:</h3>
    <div class="requisites">
      <p><strong>${data.student.fullName}</strong></p>
      <table>
        <tr><td>Паспорт:</td><td>${data.student.passport.series} ${data.student.passport.number}</td></tr>
        <tr><td>Выдан:</td><td>${data.student.passport.issuedBy}</td></tr>
        <tr><td>Дата:</td><td>${data.student.passport.issuedAt}</td></tr>
        <tr><td>Код:</td><td>${data.student.passport.departmentCode}</td></tr>
        <tr><td>Адрес:</td><td>${data.student.registrationAddress}</td></tr>
        <tr><td>Телефон:</td><td>${data.student.phone || ''}</td></tr>
        <tr><td>Email:</td><td>${data.student.email || ''}</td></tr>
      </table>
      <div class="signature-line"></div>
      <p class="signature-label">Подпись / ${data.student.fullName}</p>
    </div>
  </div>
</div>`
}

/**
 * Генерирует PDF из HTML контента
 *
 * @param html - HTML контент договора (уже с подставленными данными)
 * @param options - Опции генерации
 * @returns Promise с PDF буфером
 *
 * @example
 * ```typescript
 * const html = renderTemplate(template, data).html
 * const pdf = await generatePdf(html, { title: 'Договор №123' })
 * await fs.writeFile('contract.pdf', pdf.buffer)
 * ```
 */
export async function generatePdf(html: string, _options?: PdfOptions): Promise<PdfResult> {
  // Для серверной генерации PDF используем puppeteer
  // Это должно быть установлено как peer dependency в приложении
  const puppeteer = await import('puppeteer')

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()

    // Устанавливаем HTML контент
    await page.setContent(html, { waitUntil: 'networkidle0' })

    // Генерируем PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '15mm',
      },
    })

    return {
      buffer: Buffer.from(pdfBuffer),
      size: pdfBuffer.length,
      mimeType: 'application/pdf',
    }
  } finally {
    await browser.close()
  }
}

// Re-export шаблона по умолчанию из отдельного файла (для обратной совместимости)
export { createDefaultTrainingContractTemplate } from './default-template'
