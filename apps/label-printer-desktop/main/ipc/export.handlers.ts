/**
 * IPC handlers для экспорта данных
 */
import { createJsonStore } from '@letar/electron-storage'
import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron'
import * as fs from 'fs/promises'
import * as XLSX from 'xlsx'
import { STORAGE_FILES } from '../../shared/constants'
import type { ExportHistoryParams, ExportResult, HistoryData, PrintJob } from '../../shared/types'
import { devDataDir } from '../utils/data-dir'
import { jsonStoreLogger, logger } from '../utils/logger-helper'

/** Хранилище истории (singleton) */
const historyStorage = createJsonStore<HistoryData>(
  STORAGE_FILES.history,
  { jobs: [] },
  { dir: devDataDir(), logger: jsonStoreLogger },
)

/**
 * Фильтрация по диапазону дат
 */
function filterByDateRange(jobs: PrintJob[], startDate?: string, endDate?: string): PrintJob[] {
  let filtered = jobs

  if (startDate) {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)
    filtered = filtered.filter((job) => new Date(job.firstScannedAt) >= start)
  }

  if (endDate) {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    filtered = filtered.filter((job) => new Date(job.firstScannedAt) <= end)
  }

  return filtered
}

/**
 * IPC handlers для экспорта данных
 */
export function registerExportHandlers(): void {
  // Экспорт истории в Excel
  ipcMain.handle(
    'export:history-excel',
    async (_event: IpcMainInvokeEvent, params: ExportHistoryParams): Promise<ExportResult> => {
      try {
        const data = await historyStorage.load()
        const jobs = filterByDateRange(data.jobs, params.startDate, params.endDate)

        if (jobs.length === 0) {
          return { success: false, error: 'Нет данных для экспорта' }
        }

        // Подготовка данных для Excel
        const excelData = jobs.map((job) => ({
          GTIN: job.gtin,
          'Серийный номер': job.serialNumber,
          'Полный код': job.fullCode,
          Сканирований: job.scanCount,
          Напечатано: job.printed ? 'Да' : 'Нет',
          'Первое сканирование': new Date(job.firstScannedAt).toLocaleString('ru-RU'),
          'Последнее сканирование': new Date(job.lastScannedAt).toLocaleString('ru-RU'),
        }))

        // Создание книги Excel
        const worksheet = XLSX.utils.json_to_sheet(excelData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'История печати')

        // Автоширина колонок
        const colWidths = Object.keys(excelData[0]).map((key) => ({
          wch: Math.max(key.length, ...excelData.map((row) => String(row[key as keyof typeof row]).length)) + 2,
        }))
        worksheet['!cols'] = colWidths

        // Диалог сохранения файла
        const { filePath, canceled } = await dialog.showSaveDialog({
          title: 'Сохранить историю печати',
          defaultPath: `история_печати_${new Date().toISOString().slice(0, 10)}.xlsx`,
          filters: [{ name: 'Excel файлы', extensions: ['xlsx'] }],
        })

        if (canceled || !filePath) {
          return { success: false, error: 'Отменено пользователем' }
        }

        // Сохранение файла
        XLSX.writeFile(workbook, filePath)

        return { success: true, filePath }
      } catch (error) {
        logger.error('[ExportIPC]', 'export:history-excel error', error)
        return { success: false, error: error instanceof Error ? error.message : 'Ошибка экспорта' }
      }
    },
  )

  // Экспорт статистики в PDF (через printToPDF)
  ipcMain.handle(
    'export:stats-pdf',
    async (_event: IpcMainInvokeEvent, params: ExportHistoryParams): Promise<ExportResult> => {
      try {
        const data = await historyStorage.load()
        const jobs = filterByDateRange(data.jobs, params.startDate, params.endDate)

        // Расчёт статистики
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const totalPrinted = jobs.filter((j) => j.printed).length
        const todayPrinted = jobs.filter((j) => j.printed && new Date(j.firstScannedAt) >= today).length
        const duplicates = jobs.filter((j) => j.scanCount > 1).length
        const uniqueGtins = new Set(jobs.map((j) => j.gtin)).size

        // Создание HTML для PDF
        const dateRange = params.startDate || params.endDate
          ? `Период: ${params.startDate || 'начало'} — ${params.endDate || 'конец'}`
          : 'За всё время'

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Статистика печати</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 40px;
                color: #333;
              }
              h1 {
                color: #2563eb;
                margin-bottom: 10px;
              }
              .subtitle {
                color: #666;
                margin-bottom: 30px;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 40px;
              }
              .stat-card {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 20px;
              }
              .stat-value {
                font-size: 36px;
                font-weight: bold;
                color: #1e40af;
              }
              .stat-label {
                color: #64748b;
                margin-top: 5px;
              }
              .footer {
                margin-top: 40px;
                color: #94a3b8;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <h1>Статистика печати этикеток</h1>
            <p class="subtitle">${dateRange} • Сформировано: ${new Date().toLocaleString('ru-RU')}</p>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${totalPrinted}</div>
                <div class="stat-label">Всего напечатано этикеток</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${todayPrinted}</div>
                <div class="stat-label">Напечатано сегодня</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${duplicates}</div>
                <div class="stat-label">Заблокировано дубликатов</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${uniqueGtins}</div>
                <div class="stat-label">Уникальных GTIN</div>
              </div>
            </div>

            <div class="footer">
              Label Printer Desktop — отчёт создан автоматически
            </div>
          </body>
          </html>
        `

        // Создание скрытого окна для генерации PDF
        const win = new BrowserWindow({
          show: false,
          webPreferences: {
            offscreen: true,
          },
        })

        let pdfData: Buffer
        try {
          await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

          // Генерация PDF
          pdfData = await win.webContents.printToPDF({
            pageSize: 'A4',
            printBackground: true,
            margins: {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
            },
          })
        } finally {
          // Гарантированное закрытие окна даже при ошибке
          win.close()
        }

        // Диалог сохранения файла
        const { filePath, canceled } = await dialog.showSaveDialog({
          title: 'Сохранить отчёт статистики',
          defaultPath: `статистика_${new Date().toISOString().slice(0, 10)}.pdf`,
          filters: [{ name: 'PDF файлы', extensions: ['pdf'] }],
        })

        if (canceled || !filePath) {
          return { success: false, error: 'Отменено пользователем' }
        }

        // Сохранение PDF (async)
        await fs.writeFile(filePath, pdfData)

        return { success: true, filePath }
      } catch (error) {
        logger.error('[ExportIPC]', 'export:stats-pdf error', error)
        return { success: false, error: error instanceof Error ? error.message : 'Ошибка экспорта' }
      }
    },
  )
}
