import { ipcMain } from 'electron'
import { getPrismaClient } from '../utils/db'

export interface RecentReleaseUpsertInput {
  directoryCid: string
  name: string
  posterCid?: string | null
  episodesCount?: number
  shikimoriId?: number | null
  trackerId?: string | null
}

export function registerRecentReleaseHandlers(): void {
  ipcMain.handle('recentRelease:list', async () => {
    const db = getPrismaClient()
    return db.recentRelease.findMany({ orderBy: { lastOpenedAt: 'desc' } })
  })

  // Открытие раздачи по CID: создаёт карточку «недавнее», если её ещё нет,
  // иначе обновляет lastOpenedAt — без похода в IPFS повторно.
  ipcMain.handle('recentRelease:open', async (_event, input: RecentReleaseUpsertInput) => {
    const db = getPrismaClient()
    return db.recentRelease.upsert({
      where: { directoryCid: input.directoryCid },
      create: {
        directoryCid: input.directoryCid,
        name: input.name,
        posterCid: input.posterCid ?? null,
        episodesCount: input.episodesCount ?? 0,
        shikimoriId: input.shikimoriId ?? null,
        trackerId: input.trackerId ?? null,
      },
      update: {
        name: input.name,
        posterCid: input.posterCid ?? null,
        episodesCount: input.episodesCount ?? 0,
        lastOpenedAt: new Date(),
      },
    })
  })

  ipcMain.handle('recentRelease:remove', async (_event, id: string) => {
    const db = getPrismaClient()
    await db.recentRelease.delete({ where: { id } })
  })
}
