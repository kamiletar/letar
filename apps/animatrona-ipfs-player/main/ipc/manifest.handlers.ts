import { cat } from '@letar/ipfs-kubo-core'
import { ipcMain } from 'electron'
import { ensureIpfsStarted } from '../services/ipfs'

/** Подмножество AnimeManifest (v1/v2), нужное плееру — все поля, кроме обязательных, опциональны */
export interface ReleaseManifest {
  version: number
  name: string
  posterCid?: string
  episodesCid?: string
  episodes?: ReleaseManifestEpisode[]
  createdAt?: string
  updatedAt?: string
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

async function readJsonFromIpfs<T>(cidPath: string): Promise<T> {
  const content = await cat(cidPath)
  return JSON.parse(content.toString('utf-8')) as T
}

export interface OpenByCidResult {
  directoryCid: string
  manifest: ReleaseManifest
  episodes: ReleaseManifestEpisode[]
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

  return { directoryCid, manifest, episodes }
}

export function registerManifestHandlers(): void {
  ipcMain.handle('manifest:openByCid', async (_event, directoryCid: string) => {
    return openByCid(directoryCid)
  })

  ipcMain.handle('ipfs:start', async () => {
    await ensureIpfsStarted()
  })
}
