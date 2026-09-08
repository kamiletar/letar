import { ipcMain } from 'electron'
import { getPrismaClient } from '../utils/db'

export interface TrackerInput {
  url: string
  name: string
  description?: string | null
  theme?: string
  language?: string
}

export function registerTrackerHandlers(): void {
  ipcMain.handle('tracker:list', async () => {
    const db = getPrismaClient()
    return db.tracker.findMany({ orderBy: { name: 'asc' } })
  })

  ipcMain.handle('tracker:add', async (_event, input: TrackerInput) => {
    const db = getPrismaClient()
    return db.tracker.create({
      data: {
        url: input.url,
        name: input.name,
        description: input.description ?? null,
        theme: input.theme ?? 'anime',
        language: input.language ?? 'ru',
      },
    })
  })

  ipcMain.handle('tracker:remove', async (_event, id: string) => {
    const db = getPrismaClient()
    await db.tracker.delete({ where: { id } })
  })
}
