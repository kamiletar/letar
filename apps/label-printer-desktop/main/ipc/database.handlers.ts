/**
 * IPC handlers для работы с базой данных (история, статистика)
 */
import { createJsonStore } from '@letar/electron-storage'
import type { IpcMainInvokeEvent } from 'electron'
import { ipcMain } from 'electron'
import { STORAGE_FILES } from '../../shared/constants'
import type { HistoryData, PrintJob } from '../../shared/types'
import { devDataDir } from '../utils/data-dir'
import { jsonStoreLogger, logger } from '../utils/logger-helper'

/** Хранилище истории (singleton) */
const historyStorage = createJsonStore<HistoryData>(
  STORAGE_FILES.history,
  { jobs: [] },
  { dir: devDataDir(), logger: jsonStoreLogger }
)

/**
 * IPC handlers для работы с базой данных (история, статистика)
 */
export function registerDatabaseHandlers(): void {
  // История печати
  ipcMain.handle('database:history', async (_event: IpcMainInvokeEvent, { limit = 50, offset = 0 }) => {
    try {
      const data = await historyStorage.load()
      // Сортируем по дате (новые первые) и применяем пагинацию
      const sorted = data.jobs.sort(
        (a, b) => new Date(b.firstScannedAt).getTime() - new Date(a.firstScannedAt).getTime()
      )
      return sorted.slice(offset, offset + limit)
    } catch (error) {
      logger.error('[DatabaseIPC]', 'database:history error', error)
      return []
    }
  })

  // Статистика печати
  ipcMain.handle('database:stats', async () => {
    try {
      const data = await historyStorage.load()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayJobs = data.jobs.filter((job) => new Date(job.firstScannedAt) >= today)

      return {
        totalPrinted: data.jobs.length,
        todayPrinted: todayJobs.filter((j) => j.printed).length,
        duplicatesBlocked: data.jobs.filter((j) => j.scanCount > 1).length,
        lastPrintTime: null,
      }
    } catch (error) {
      logger.error('[DatabaseIPC]', 'database:stats error', error)
      return {
        totalPrinted: 0,
        todayPrinted: 0,
        duplicatesBlocked: 0,
        lastPrintTime: null,
      }
    }
  })

  // Статистика по дням (для графика)
  ipcMain.handle('database:dailyStats', async (_event: IpcMainInvokeEvent, { days = 7 }) => {
    try {
      const data = await historyStorage.load()
      const result: Array<{ date: string; printed: number; scanned: number }> = []

      // Создаём массив последних N дней
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)

        const nextDate = new Date(date)
        nextDate.setDate(nextDate.getDate() + 1)

        // Считаем этикетки за этот день
        const dayJobs = data.jobs.filter((job) => {
          const jobDate = new Date(job.firstScannedAt)
          return jobDate >= date && jobDate < nextDate
        })

        result.push({
          date: date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }),
          printed: dayJobs.filter((j) => j.printed).length,
          scanned: dayJobs.length,
        })
      }

      return result
    } catch (error) {
      logger.error('[DatabaseIPC]', 'database:dailyStats error', error)
      return []
    }
  })

  // Очистка истории
  ipcMain.handle('database:clear', async () => {
    try {
      await historyStorage.save({ jobs: [] })
      return true
    } catch (error) {
      logger.error('[DatabaseIPC]', 'database:clear error', error)
      return false
    }
  })

  // Удалить записи по ID (bulk delete)
  ipcMain.handle('database:deleteJobs', async (_event: IpcMainInvokeEvent, ids: string[]) => {
    try {
      const data = await historyStorage.load()
      const idsSet = new Set(ids)
      data.jobs = data.jobs.filter((job) => !idsSet.has(job.id))
      await historyStorage.save(data)
      return { success: true, deletedCount: ids.length }
    } catch (error) {
      logger.error('[DatabaseIPC]', 'database:deleteJobs error', error)
      return { success: false, error: String(error) }
    }
  })

  // Статистика за период (для сравнения)
  ipcMain.handle(
    'database:statsForPeriod',
    async (_event: IpcMainInvokeEvent, { startDate, endDate }: { startDate: string; endDate: string }) => {
      try {
        const data = await historyStorage.load()

        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)

        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)

        // Фильтруем по периоду
        const periodJobs = data.jobs.filter((job) => {
          const jobDate = new Date(job.firstScannedAt)
          return jobDate >= start && jobDate <= end
        })

        return {
          totalPrinted: periodJobs.filter((j) => j.printed).length,
          totalScanned: periodJobs.length,
          duplicatesBlocked: periodJobs.filter((j) => j.scanCount > 1).length,
          daysCount: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
        }
      } catch (error) {
        logger.error('[DatabaseIPC]', 'database:statsForPeriod error', error)
        return {
          totalPrinted: 0,
          totalScanned: 0,
          duplicatesBlocked: 0,
          daysCount: 0,
        }
      }
    }
  )

  // Добавить задание в историю (вызывается из print handlers)
  ipcMain.handle('database:addJob', async (_event: IpcMainInvokeEvent, job: Omit<PrintJob, 'id'>) => {
    try {
      const data = await historyStorage.load()
      const newJob: PrintJob = {
        ...job,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      }
      data.jobs.push(newJob)
      await historyStorage.save(data)
      return newJob
    } catch (error) {
      logger.error('[DatabaseIPC]', 'database:addJob error', error)
      return null
    }
  })
}
