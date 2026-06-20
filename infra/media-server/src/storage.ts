import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { config } from './config.ts'

export function rawDir(appId: string, videoId: string) {
  return join(config.dataPath, 'raw', appId, videoId)
}

export function processedDir(appId: string, videoId: string) {
  return join(config.dataPath, 'processed', appId, videoId)
}

export function sourcePath(appId: string, videoId: string, ext: string) {
  return join(rawDir(appId, videoId), `source.${ext}`)
}

export function outputPath(appId: string, videoId: string, filename: string) {
  return join(processedDir(appId, videoId), filename)
}

export function videoUrls(appId: string, videoId: string) {
  const base = `https://media.letar.best/v/${appId}/${videoId}`
  return {
    '320p': `${base}/320p.mp4`,
    '720p': `${base}/720p.mp4`,
    '1080p': `${base}/1080p.mp4`,
    poster: `${base}/poster.jpg`,
  }
}

export async function ensureDir(path: string) {
  await mkdir(path, { recursive: true })
}

export async function removeDir(path: string) {
  await rm(path, { recursive: true, force: true })
}
