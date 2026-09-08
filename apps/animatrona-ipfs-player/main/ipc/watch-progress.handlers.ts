import { ipcMain } from 'electron'
import { getPrismaClient } from '../utils/db'

export interface WatchProgressUpsertInput {
  releaseKey: string
  episodeNumber: number
  currentTime: number
  duration: number
  completed?: boolean
  selectedAudioTrackId?: string | null
  selectedSubtitleTrackId?: string | null
}

export function registerWatchProgressHandlers(): void {
  ipcMain.handle('watchProgress:get', async (_event, releaseKey: string, episodeNumber: number) => {
    const db = getPrismaClient()
    return db.watchProgress.findUnique({
      where: { releaseKey_episodeNumber: { releaseKey, episodeNumber } },
    })
  })

  // Прогресс по всей раздаче — «продолжить просмотр», отметки на карточках эпизодов
  ipcMain.handle('watchProgress:listForRelease', async (_event, releaseKey: string) => {
    const db = getPrismaClient()
    return db.watchProgress.findMany({ where: { releaseKey } })
  })

  ipcMain.handle('watchProgress:upsert', async (_event, input: WatchProgressUpsertInput) => {
    const db = getPrismaClient()
    return db.watchProgress.upsert({
      where: { releaseKey_episodeNumber: { releaseKey: input.releaseKey, episodeNumber: input.episodeNumber } },
      create: {
        releaseKey: input.releaseKey,
        episodeNumber: input.episodeNumber,
        currentTime: input.currentTime,
        duration: input.duration,
        completed: input.completed ?? false,
        selectedAudioTrackId: input.selectedAudioTrackId ?? null,
        selectedSubtitleTrackId: input.selectedSubtitleTrackId ?? null,
      },
      update: {
        currentTime: input.currentTime,
        duration: input.duration,
        completed: input.completed ?? false,
        selectedAudioTrackId: input.selectedAudioTrackId ?? null,
        selectedSubtitleTrackId: input.selectedSubtitleTrackId ?? null,
        lastWatchedAt: new Date(),
      },
    })
  })
}
