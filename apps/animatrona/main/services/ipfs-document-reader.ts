/**
 * IPFS Document Reader — Чтение документов из IPFS по CID
 *
 * Все функции get*FromIpfs для получения типизированных документов из IPFS.
 */

import type { AnimeInfo } from '../../shared/types/anime-info'
import type {
  AnimeManifest,
  EpisodePreviewsDocument,
  EpisodesDocument,
  FranchiseGraphDocument,
  RelationsDocument,
} from '../../shared/types/anime-manifest'
import { createModuleLogger } from '../utils/logger'
import { cat } from './ipfs/unixfs-service'

const log = createModuleLogger('IpfsDocumentReader')

/**
 * Generic хелпер для чтения JSON документа из IPFS по CID
 */
async function readIpfsJson<T>(cid: string, label: string): Promise<T | null> {
  try {
    const content = await cat(cid)
    return JSON.parse(content.toString('utf-8')) as T
  } catch (error) {
    log.error(`Ошибка получения ${label} из IPFS`, {
      cid,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/** Получить AnimeInfo из IPFS по CID */
export function getAnimeInfoFromIpfs(cid: string): Promise<AnimeInfo | null> {
  return readIpfsJson<AnimeInfo>(cid, 'AnimeInfo')
}

/** Получить EpisodesDocument из IPFS по CID */
export function getEpisodesDocFromIpfs(cid: string): Promise<EpisodesDocument | null> {
  return readIpfsJson<EpisodesDocument>(cid, 'EpisodesDocument')
}

/** Получить FranchiseGraphDocument из IPFS по CID */
export function getFranchiseGraphDocFromIpfs(cid: string): Promise<FranchiseGraphDocument | null> {
  return readIpfsJson<FranchiseGraphDocument>(cid, 'FranchiseGraphDocument')
}

/** Получить RelationsDocument из IPFS по CID */
export function getRelationsDocFromIpfs(cid: string): Promise<RelationsDocument | null> {
  return readIpfsJson<RelationsDocument>(cid, 'RelationsDocument')
}

/** Получить EpisodePreviewsDocument из IPFS по CID */
export function getEpisodePreviewsDocFromIpfs(cid: string): Promise<EpisodePreviewsDocument | null> {
  return readIpfsJson<EpisodePreviewsDocument>(cid, 'EpisodePreviewsDocument')
}

/** Получить AnimeManifest из IPFS по CID */
export function getAnimeManifestFromIpfs(cid: string): Promise<AnimeManifest | null> {
  return readIpfsJson<AnimeManifest>(cid, 'AnimeManifest')
}
