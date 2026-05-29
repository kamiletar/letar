/**
 * Preload — Манифесты (AnimeManifest, AnimeInfo, EpisodeManifest)
 *
 * Генерация, чтение и обновление манифестов для IPFS.
 */

import { ipcRenderer } from 'electron'
import type { DemuxResult } from '../../shared/types'
import type { AnimeInfo, GenerateAnimeInfoResult } from '../../shared/types/anime-info'
import type {
  AnimeManifest,
  GenerateAnimeManifestInput,
  GenerateAnimeManifestResult,
} from '../../shared/types/anime-manifest'
import type {
  EpisodeManifest,
  ManifestChapter,
  ManifestEncodingInfo,
  ManifestThumbnails,
} from '../../shared/types/manifest'

/** AnimeManifest (IPFS) */
export const animeManifestPreload = {
  /** Генерировать манифест аниме и опубликовать в IPFS */
  generate: (
    input: GenerateAnimeManifestInput
  ): Promise<{ success: boolean; data?: GenerateAnimeManifestResult; error?: string }> =>
    ipcRenderer.invoke('animeManifest:generate', input),

  /** Обновить манифест аниме и сохранить CID в БД */
  update: (animeId: string): Promise<{ success: boolean; data?: GenerateAnimeManifestResult; error?: string }> =>
    ipcRenderer.invoke('animeManifest:update', animeId),

  /** Получить манифест из IPFS по CID */
  get: (manifestCid: string): Promise<{ success: boolean; data?: AnimeManifest; error?: string }> =>
    ipcRenderer.invoke('animeManifest:get', manifestCid),

  /** Получить манифест аниме по ID аниме (из IPFS или сгенерировать) */
  getByAnimeId: (animeId: string): Promise<{ success: boolean; data?: AnimeManifest; error?: string }> =>
    ipcRenderer.invoke('animeManifest:getByAnimeId', animeId),

  /** Batch-генерация манифестов для нескольких аниме */
  generateBatch: (
    animeIds: string[]
  ): Promise<{
    success: boolean
    data?: { success: number; failed: number; errors: Array<{ animeId: string; error: string }> }
    error?: string
  }> => ipcRenderer.invoke('animeManifest:generateBatch', animeIds),

  /** Получить список аниме без directoryCid */
  getAnimesWithoutManifest: (): Promise<{
    success: boolean
    data?: Array<{ id: string; name: string }>
    error?: string
  }> => ipcRenderer.invoke('animeManifest:getAnimesWithoutManifest'),

  /** Импортировать аниме из IPFS (directoryCid или manifestCid) */
  import: (
    cid: string,
    pin?: boolean
  ): Promise<{
    success: boolean
    data?: { animeId: string; animeName: string; episodeCount: number }
    error?: string
  }> => ipcRenderer.invoke('animeManifest:import', cid, pin),

  /** Получить список аниме без animeInfoCid */
  getAnimesWithoutAnimeInfo: (): Promise<{
    success: boolean
    data?: Array<{ id: string; name: string }>
    error?: string
  }> => ipcRenderer.invoke('animeManifest:getAnimesWithoutAnimeInfo'),

  /** Регенерировать все манифесты. opts.resumeFrom — ISO timestamp старта прерванного запуска */
  regenerateAll: (opts?: {
    resumeFrom?: string
  }): Promise<{
    success: boolean
    data?: { success: number; failed: number; errors: Array<{ animeId: string; error: string }> }
    error?: string
  }> => ipcRenderer.invoke('animeManifest:regenerateAll', opts),

  /** Остановить регенерацию (после текущего аниме, чекпоинт сохраняется) */
  stopRegeneration: (): Promise<{ success: boolean; data?: true; error?: string }> =>
    ipcRenderer.invoke('animeManifest:stopRegeneration'),

  /** Получить чекпоинт прерванной регенерации (null если нет) */
  getRegenCheckpoint: (): Promise<{
    success: boolean
    data?: { startedAt: string; total: number; pending: number } | null
    error?: string
  }> => ipcRenderer.invoke('animeManifest:getRegenCheckpoint'),

  /** Дедупликация дорожек (AudioTrack / SubtitleTrack) */
  deduplicateTracks: (): Promise<{
    success: boolean
    data?: { audioRemoved: number; subtitlesRemoved: number; fontsRemoved: number }
    error?: string
  }> => ipcRenderer.invoke('tracks:deduplicate'),

  /** Сводка по contentHealth — счётчики complete/degraded/broken/unknown */
  getHealthSummary: (): Promise<{
    success: boolean
    data?: { complete: number; degraded: number; broken: number; unknown: number }
    error?: string
  }> => ipcRenderer.invoke('animeManifest:getHealthSummary'),

  /** Получить текущее состояние регенерации (для восстановления UI после навигации) */
  getRegenerationStatus: (): Promise<{
    success: boolean
    data?: {
      isRegenerating: boolean
      startedAt: number | null
      finishedAt: number | null
      current: number
      total: number
      currentAnimeName: string | null
      log: Array<{
        id: string
        timestamp: number
        level: 'info' | 'warn' | 'error' | 'success'
        message: string
        meta?: Record<string, unknown>
      }>
      result: {
        success: number
        failed: number
        errors: Array<{ animeId: string; error: string }>
      } | null
    }
    error?: string
  }> => ipcRenderer.invoke('animeManifest:getRegenerationStatus'),

  /** Сбросить state регенерации (после ack пользователем) */
  resetRegenerationState: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('animeManifest:resetRegenerationState'),

  /** Подписка на старт новой регенерации — renderer должен очистить старый лог */
  onRegenerateStarted: (callback: (data: { total: number }) => void): (() => void) => {
    const handler = (_event: unknown, data: unknown) => callback(data as { total: number })
    ipcRenderer.on('manifest:regenerateStarted', handler)
    return () => ipcRenderer.removeListener('manifest:regenerateStarted', handler)
  },

  /** Подписка на live-события лога регенерации */
  onRegenerateLog: (
    callback: (entry: {
      id: string
      timestamp: number
      level: 'info' | 'warn' | 'error' | 'success'
      message: string
      meta?: Record<string, unknown>
    }) => void
  ): (() => void) => {
    const handler = (_event: unknown, entry: unknown) => callback(entry as Parameters<typeof callback>[0])
    ipcRenderer.on('manifest:regenerateLog', handler)
    return () => ipcRenderer.removeListener('manifest:regenerateLog', handler)
  },

  /** Подписка на завершение регенерации */
  onRegenerateFinished: (
    callback: (data: { success: number; failed: number; stopped?: boolean; diskFull?: boolean }) => void
  ): (() => void) => {
    const handler = (_event: unknown, data: unknown) =>
      callback(data as { success: number; failed: number; stopped?: boolean; diskFull?: boolean })
    ipcRenderer.on('manifest:regenerateFinished', handler)
    return () => ipcRenderer.removeListener('manifest:regenerateFinished', handler)
  },

  /** Список аниме с потерями (degraded или broken) для UI-отчёта */
  getDegradedAndBroken: (): Promise<{
    success: boolean
    data?: Array<{
      id: string
      name: string
      contentHealth: string | null
      missingCidsJson: string | null
      missingFontsJson: string | null
    }>
    error?: string
  }> => ipcRenderer.invoke('animeManifest:getDegradedAndBroken'),

  /** Подписка на прогресс регенерации */
  onRegenerateProgress: (
    callback: (data: {
      current: number
      total: number
      animeName: string
      status: 'processing' | 'ok' | 'error'
      error?: string
    }) => void
  ): (() => void) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      data: {
        current: number
        total: number
        animeName: string
        status: 'processing' | 'ok' | 'error'
        error?: string
      }
    ) => callback(data)
    ipcRenderer.on('manifest:regenerateProgress', handler)
    return () => ipcRenderer.removeListener('manifest:regenerateProgress', handler)
  },

  /** Точечная регенерация EpisodeManifest + AnimeManifest + directoryCid для одного аниме */
  regenerateForAnime: (
    animeId: string
  ): Promise<{
    success: boolean
    data?: { updated: number; failed: number }
    error?: string
  }> => ipcRenderer.invoke('publisher:regenerateForAnime', animeId),
}

/** AnimeInfo (IPFS, каноничные неизменяемые метаданные) */
export const animeInfoPreload = {
  /** Получить AnimeInfo из IPFS по CID */
  get: (animeInfoCid: string): Promise<{ success: boolean; data?: AnimeInfo; error?: string }> =>
    ipcRenderer.invoke('animeInfo:get', animeInfoCid),

  /** Генерировать AnimeInfo для аниме и опубликовать в IPFS */
  generate: (animeId: string): Promise<{ success: boolean; data?: GenerateAnimeInfoResult; error?: string }> =>
    ipcRenderer.invoke('animeInfo:generate', animeId),
}

/** EpisodeManifest */
export const manifestPreload = {
  /** Сгенерировать манифест из результатов demux */
  generate: (
    demuxResult: DemuxResult,
    options: {
      episodeId: string
      videoPath: string
      outputDir: string
      animeInfo: {
        animeName: string
        seasonNumber: number
        episodeNumber: number
        episodeName?: string
      }
    }
  ): Promise<{
    success: boolean
    manifestPath?: string
    manifest?: EpisodeManifest
    error?: string
  }> => ipcRenderer.invoke('manifest:generate', demuxResult, options),

  /** Прочитать существующий манифест */
  read: (
    manifestPath: string
  ): Promise<{
    success: boolean
    data?: EpisodeManifest
    error?: string
  }> => ipcRenderer.invoke('manifest:read', manifestPath),

  /** Обновить навигацию в манифесте */
  updateNavigation: (
    manifestPath: string,
    navigation: {
      nextEpisode?: { id: string; manifestPath: string }
      prevEpisode?: { id: string; manifestPath: string }
    }
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('manifest:updateNavigation', manifestPath, navigation),

  /** Обновить thumbnails в манифесте (с CID для IPFS) */
  updateThumbnails: (
    manifestPath: string,
    thumbnails: {
      vttCid: string
      spriteCid: string
    }
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('manifest:updateThumbnails', manifestPath, thumbnails),

  /** Batch-обновление навигации между эпизодами через IPFS */
  updateNavigationBatch: (
    episodes: Array<{ id: string; manifestCid: string }>
  ): Promise<{ success: boolean; data?: Record<string, string>; error?: string }> =>
    ipcRenderer.invoke('manifest:updateNavigationBatch', episodes),

  /** Получить главы эпизода из IPFS манифеста */
  getChapters: (manifestCid: string): Promise<{ success: boolean; data?: ManifestChapter[]; error?: string }> =>
    ipcRenderer.invoke('manifest:getChapters', manifestCid),

  /** Обновить главы эпизода через IPFS */
  updateChapters: (
    episodeId: string,
    chapters: ManifestChapter[]
  ): Promise<{ success: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke('manifest:updateChapters', episodeId, chapters),

  /** Копировать главы из одного эпизода в другие */
  copyChapters: (
    sourceEpisodeId: string,
    targetEpisodeIds: string[],
    chapterTypes: string[]
  ): Promise<{ success: boolean; data?: { count: number; skipped: number }; error?: string }> =>
    ipcRenderer.invoke('manifest:copyChapters', sourceEpisodeId, targetEpisodeIds, chapterTypes),

  /** Генерация RECAP/PREVIEW глав */
  generateRecapPreview: (
    episodes: Array<{ id: string; manifestCid: string; durationMs: number }>
  ): Promise<{ success: boolean; data?: { created: number; skipped: number }; error?: string }> =>
    ipcRenderer.invoke('manifest:generateRecapPreview', episodes),

  /** Обновить информацию о кодировании в манифесте */
  updateEncoding: (
    manifestPath: string,
    encoding: {
      profileName: string
      codec: string
      cq: number
      preset: string
      rateControl: string
      tune?: string
      multipass?: string
      spatialAq?: boolean
      temporalAq?: boolean
      aqStrength?: number
      gopSize?: number
      lookahead?: number
      bRefMode?: string
      force10Bit?: boolean
      vmafScore?: number
      encoderType: 'gpu' | 'cpu'
      hardwareModel?: string
      ffmpegVersion?: string
      ffmpegCommand?: string
      transcodeDurationMs?: number
      activeGpuWorkers?: number
      videoMaxConcurrent?: number
      audioMaxConcurrent?: number
      sourceSize?: number
      transcodedSize?: number
      compressionRatio?: number
    }
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('manifest:updateEncoding', manifestPath, encoding),

  /** Обновить CID'ы медиафайлов в манифесте перед загрузкой в IPFS */
  updateMediaCids: (
    manifestPath: string,
    options: {
      videoCid?: string
      audioTrackCids?: Record<string, string>
      audioTrackCodecs?: Record<string, string>
      audioTrackChannels?: Record<string, string>
      subtitleTrackCids?: Record<string, string>
      fontCids?: Record<string, string>
      sizes?: Record<string, number>
      metadataCid?: string
    }
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('manifest:updateMediaCids', manifestPath, options),

  /** Получить информацию о кодировании из IPFS манифеста */
  getEncoding: (manifestCid: string): Promise<{ success: boolean; data?: ManifestEncodingInfo; error?: string }> =>
    ipcRenderer.invoke('manifest:getEncoding', manifestCid),

  /** Получить thumbnails из IPFS манифеста */
  getThumbnails: (manifestCid: string): Promise<{ success: boolean; data?: ManifestThumbnails; error?: string }> =>
    ipcRenderer.invoke('manifest:getThumbnails', manifestCid),

  /** Полная перестройка аудио/субтитров в манифесте из БД (включая внешние дорожки) */
  rebuildTracksFromDb: (
    manifestPath: string,
    episodeId: string
  ): Promise<{ success: boolean; data?: { changed: boolean }; error?: string }> =>
    ipcRenderer.invoke('manifest:rebuildTracksFromDb', manifestPath, episodeId),
}
