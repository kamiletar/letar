import { cat } from '@letar/ipfs-kubo-core'
import { ipcMain } from 'electron'
import { ensureIpfsStarted, getGatewayUrl } from '../services/ipfs'

/** Подмножество AnimeManifest (v1/v2), нужное плееру — все поля, кроме обязательных, опциональны */
export interface ReleaseManifest {
  version: number
  name: string
  posterCid?: string
  episodesCid?: string
  episodes?: ReleaseManifestEpisode[]
  createdAt?: string
  updatedAt?: string
  /** CID документа AnimeInfo (метаданные) — источник `externalIds.shikimori` для releaseKey */
  animeInfoCid?: string
}

/** Подмножество AnimeInfo, нужное только для releaseKey — см. PLAN.md § «Ключ прогресса просмотра» */
interface ReleaseAnimeInfo {
  externalIds?: {
    shikimori?: number
  }
}

/** Стабильный ключ раздачи: shikimoriId, иначе CID директории — решение владельца, PLAN.md */
export function getReleaseKey(shikimoriId: number | undefined, directoryCid: string): string {
  return shikimoriId !== undefined ? `shikimori:${shikimoriId}` : `cid:${directoryCid}`
}

export interface ReleaseManifestEpisode {
  number: number
  season?: number
  name?: string
  manifestCid: string
  videoCid?: string
  size: number
  durationMs?: number
}

interface EpisodesDocument {
  version: number
  episodes: ReleaseManifestEpisode[]
}

/** Подмножество EpisodeManifest (`libs/animatrona-types`), нужное плееру — не импортируется
 * напрямую (см. правило проекта «не импортирует @letar/animatrona-types»), только локальная
 * копия формы данных. */
export interface ReleaseEpisodeVideo {
  cid: string
  durationMs: number
}

export interface ReleaseEpisodeAudioTrack {
  id: string
  language: string
  title: string
  cid?: string
  isDefault: boolean
}

export interface ReleaseEpisodeSubtitleFont {
  name: string
  cid?: string
}

export interface ReleaseEpisodeSubtitleTrack {
  id: string
  language: string
  title: string
  format: 'ass' | 'ssa' | 'srt' | 'vtt'
  cid?: string
  isDefault: boolean
  fonts?: ReleaseEpisodeSubtitleFont[]
}

export interface ReleaseEpisodeManifest {
  video: ReleaseEpisodeVideo
  audioTracks: ReleaseEpisodeAudioTrack[]
  subtitleTracks: ReleaseEpisodeSubtitleTrack[]
}

async function readJsonFromIpfs<T>(cidPath: string): Promise<T> {
  const content = await cat(cidPath)
  return JSON.parse(content.toString('utf-8')) as T
}

export interface OpenByCidResult {
  directoryCid: string
  manifest: ReleaseManifest
  episodes: ReleaseManifestEpisode[]
  /** Стабильный ключ раздачи для WatchProgress — см. `getReleaseKey` */
  releaseKey: string
}

/**
 * Прочитать раздачу по CID директории: manifest.json → (опционально) EpisodesDocument.
 * Запускает Kubo-ноду при первом обращении, если она ещё не поднята.
 */
async function openByCid(directoryCid: string): Promise<OpenByCidResult> {
  await ensureIpfsStarted()

  const manifest = await readJsonFromIpfs<ReleaseManifest>(`${directoryCid}/manifest.json`)

  let episodes = manifest.episodes ?? []
  if (episodes.length === 0 && manifest.episodesCid) {
    const doc = await readJsonFromIpfs<EpisodesDocument>(manifest.episodesCid)
    episodes = doc.episodes
  }

  // shikimoriId — не обязательное поле AnimeInfo, чтение не должно валить открытие раздачи
  let shikimoriId: number | undefined
  if (manifest.animeInfoCid) {
    try {
      const animeInfo = await readJsonFromIpfs<ReleaseAnimeInfo>(manifest.animeInfoCid)
      shikimoriId = animeInfo.externalIds?.shikimori
    } catch {
      shikimoriId = undefined
    }
  }

  return { directoryCid, manifest, episodes, releaseKey: getReleaseKey(shikimoriId, directoryCid) }
}

/** Прочитать EpisodeManifest эпизода по CID (сам манифест — JSON-документ, не директория) */
async function openEpisode(manifestCid: string): Promise<ReleaseEpisodeManifest> {
  await ensureIpfsStarted()
  return readJsonFromIpfs<ReleaseEpisodeManifest>(manifestCid)
}

export function registerManifestHandlers(): void {
  ipcMain.handle('manifest:openByCid', async (_event, directoryCid: string) => {
    return openByCid(directoryCid)
  })

  ipcMain.handle('manifest:openEpisode', async (_event, manifestCid: string) => {
    return openEpisode(manifestCid)
  })

  ipcMain.handle('ipfs:start', async () => {
    await ensureIpfsStarted()
  })

  ipcMain.handle('ipfs:getGatewayUrl', () => {
    return getGatewayUrl()
  })
}
