import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { config } from './config.ts'
import { POSTER_FILE, type Rendition, RENDITIONS } from './transcode.ts'

export function rawDir(appId: string, videoId: string) {
  return join(config.dataPath, 'raw', appId, videoId)
}

export function processedDir(appId: string, videoId: string) {
  return join(config.dataPath, 'processed', appId, videoId)
}

export function sourcePath(appId: string, videoId: string, ext: string) {
  return join(rawDir(appId, videoId), `source.${ext}`)
}

/** Ключи ответа — публичный контракт вебхука video.ready (libs/media-client), менять нельзя */
export function videoUrls(appId: string, videoId: string) {
  const base = `${config.publicUrl}/v/${appId}/${videoId}`
  const urls = Object.fromEntries(
    RENDITIONS.map((rendition) => [rendition.key, `${base}/${rendition.file}`]),
  ) as Record<Rendition['key'], string>
  return { ...urls, poster: `${base}/${POSTER_FILE}` }
}

export async function ensureDir(path: string) {
  await mkdir(path, { recursive: true })
}

export async function removeDir(path: string) {
  await rm(path, { recursive: true, force: true })
}
