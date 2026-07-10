/**
 * Сбор ВСЕХ referenced CIDs из библиотеки для аудита пинов.
 *
 * Два источника:
 * 1. БД — directoryCid из Anime; videoCid из AnimeEpisode
 * 2. IPFS манифесты — глубокий обход через gateway:
 *    AnimeManifest → EpisodesDocument → EpisodeManifest → sub-documents
 *
 * Порт extractCidsFromJson() из Desktop orphan-audit.ts:53-88.
 */

import type { AuditJob } from '@/lib/audit-job-store'
import { addManifestError, updateJobProgress } from '@/lib/audit-job-store'
import { prisma } from '@/lib/db'

const GATEWAY_URL = process.env.IPFS_GATEWAY_URL || 'https://gateway.letar.best'
const FETCH_TIMEOUT_MS = 15_000

/**
 * Рекурсивное извлечение CID из JSON по паттернам полей.
 * Порт из apps/animatrona/main/services/ipfs/orphan-audit.ts:53-88
 *
 * - Поле `cid` или `*Cid` (string) → добавляется в set
 * - Поле `*Cids` (string[]) → все элементы добавляются
 * - Рекурсивный обход объектов и массивов
 */
export function extractCidsFromJson(obj: unknown, cids: Set<string>): void {
  if (!obj || typeof obj !== 'object') {
    return
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      extractCidsFromJson(item, cids)
    }
    return
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === 'string' && value.length > 0) {
      // Поля вида *Cid, *cid, cid
      if (key === 'cid' || key.endsWith('Cid')) {
        cids.add(value)
      }
    } else if (Array.isArray(value)) {
      // Поля вида *Cids — массив строк CID
      if (key.endsWith('Cids')) {
        for (const item of value) {
          if (typeof item === 'string' && item.length > 0) {
            cids.add(item)
          }
        }
      }
      // Рекурсивно обходим массивы объектов
      for (const item of value) {
        extractCidsFromJson(item, cids)
      }
    } else if (typeof value === 'object' && value !== null) {
      extractCidsFromJson(value, cids)
    }
  }
}

/** Безопасно загрузить JSON из IPFS gateway по CID */
async function fetchJsonFromGateway(cid: string): Promise<unknown> {
  const res = await fetch(`${GATEWAY_URL}/ipfs/${cid}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`Gateway ${res.status} для ${cid}`)
  }
  return res.json()
}

/** Безопасно загрузить JSON по path-based URL (directoryCid/path) */
async function fetchJsonFromPath(url: string, job: AuditJob, context: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) {
      addManifestError(job, `${context}: Gateway ${res.status}`)
      return null
    }
    return res.json()
  } catch (err) {
    addManifestError(job, `${context}: ${err instanceof Error ? err.message : 'Unknown'}`)
    return null
  }
}

/** Безопасная обёртка — ошибки логируются, не прерывают процесс */
async function safeFetchJson(cid: string, job: AuditJob, context: string): Promise<unknown | null> {
  try {
    return await fetchJsonFromGateway(cid)
  } catch (err) {
    addManifestError(job, `${context}: ${err instanceof Error ? err.message : 'Unknown'}`)
    return null
  }
}

/**
 * Глубокий обход EpisodeManifest — извлечение CIDs из sub-documents:
 * chaptersCid, thumbnailsCid, encodingCid
 */
async function traverseEpisodeManifest(
  manifestCid: string,
  cids: Set<string>,
  job: AuditJob,
  animeName: string
): Promise<void> {
  const manifest = await safeFetchJson(manifestCid, job, `EpisodeManifest ${animeName}`)
  if (!manifest) {
    return
  }

  extractCidsFromJson(manifest, cids)

  // Sub-documents эпизода
  const m = manifest as Record<string, unknown>
  for (const subField of ['chaptersCid', 'thumbnailsCid', 'encodingCid']) {
    const subCid = m[subField]
    if (typeof subCid === 'string' && subCid.length > 0) {
      const subDoc = await safeFetchJson(subCid, job, `${subField} ${animeName}`)
      if (subDoc) {
        extractCidsFromJson(subDoc, cids)
      }
    }
  }
}

/**
 * Глубокий обход AnimeManifest — извлечение ВСЕХ CIDs из дерева документов.
 *
 * AnimeManifest
 * ├── episodesCid → EpisodesDocument → episodes[].manifestCid → EpisodeManifest
 * ├── animeInfoCid → AnimeInfo
 * ├── relationsCid → RelationsDocument
 * ├── franchiseGraphCid → FranchiseGraphDocument
 * └── episodePreviewsCid → EpisodePreviewsDocument
 */
async function traverseAnimeManifest(
  directoryCid: string,
  cids: Set<string>,
  job: AuditJob,
  animeName: string
): Promise<void> {
  const manifest = await fetchJsonFromPath(
    `${GATEWAY_URL}/ipfs/${directoryCid}/manifest.json`,
    job,
    `AnimeManifest ${animeName}`
  )
  if (!manifest) {
    return
  }

  // Извлечь все CID из самого манифеста
  extractCidsFromJson(manifest, cids)

  const m = manifest as Record<string, unknown>

  // EpisodesDocument → per-episode manifests
  if (typeof m.episodesCid === 'string' && m.episodesCid.length > 0) {
    const episodesDoc = await safeFetchJson(m.episodesCid, job, `EpisodesDocument ${animeName}`)
    if (episodesDoc) {
      extractCidsFromJson(episodesDoc, cids)

      // Для каждого эпизода — загрузить EpisodeManifest
      const ed = episodesDoc as Record<string, unknown>
      const episodes = Array.isArray(ed.episodes) ? ed.episodes : []
      for (const ep of episodes) {
        if (ep && typeof ep === 'object') {
          const epObj = ep as Record<string, unknown>
          if (typeof epObj.manifestCid === 'string' && epObj.manifestCid.length > 0) {
            await traverseEpisodeManifest(epObj.manifestCid, cids, job, animeName)
          }
        }
      }
    }
  }

  // Sub-documents аниме
  for (const subField of ['animeInfoCid', 'relationsCid', 'franchiseGraphCid', 'episodePreviewsCid']) {
    const subCid = m[subField]
    if (typeof subCid === 'string' && subCid.length > 0) {
      const subDoc = await safeFetchJson(subCid, job, `${subField} ${animeName}`)
      if (subDoc) {
        extractCidsFromJson(subDoc, cids)
      }
    }
  }
}

/**
 * Собрать ВСЕ referenced CIDs из библиотеки.
 * Обновляет прогресс задачи по мере обработки.
 */
export async function collectAllReferencedCids(job: AuditJob): Promise<Set<string>> {
  const cids = new Set<string>()

  // 1. CIDs из БД
  const publishedAnime = await prisma.anime.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, title: true, directoryCid: true },
  })

  for (const anime of publishedAnime) {
    if (anime.directoryCid) {
      cids.add(anime.directoryCid)
    }
  }

  // VideoCids из эпизодов
  const episodes = await prisma.animeEpisode.findMany({
    where: { anime: { status: 'PUBLISHED' } },
    select: { videoCid: true },
  })
  for (const ep of episodes) {
    if (ep.videoCid) {
      cids.add(ep.videoCid)
    }
  }

  const dbCidsCount = cids.size

  // 2. Глубокий обход IPFS манифестов через directoryCid
  const animeWithDir = publishedAnime.filter((a) => a.directoryCid)
  const total = animeWithDir.length
  updateJobProgress(job, 0, total, `БД: ${dbCidsCount} CIDs. Обход манифестов...`)

  for (let i = 0; i < animeWithDir.length; i++) {
    const anime = animeWithDir[i]!
    updateJobProgress(job, i + 1, total, anime.title)
    await traverseAnimeManifest(anime.directoryCid!, cids, job, anime.title)
  }

  return cids
}
