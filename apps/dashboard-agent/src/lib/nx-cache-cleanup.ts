/**
 * Плановая чистка `.nx/cache` (локальный кеш задач Nx) в чекауте репозитория на хосте —
 * отдельный источник места от `.next/cache` (`next-cache-cleanup.ts`, ~30GB) и от Docker
 * (`docker-prune.ts`). Обнаружено при разборе инцидента 2026-09-06 (диск s2 100%): `.nx/cache`
 * занимал 64GB — больше, чем Docker images (13GB) и build cache (17GB) вместе взятые, и для
 * него не было вообще никакой чистки, ни разовой, ни плановой. Nx не удаляет старые записи
 * кеша сам — единственный штатный способ вручную это `nx reset`, который сносит кеш целиком
 * (а не по возрасту) и обнуляет память ВСЕХ задач сразу, а не только простаивающих.
 *
 * Каждая запись кеша — подкаталог `.nx/cache/<hash>`, независимая от остальных (результат одной
 * задачи: build/lint/typecheck/test для одного проекта на одном входном хеше). Замер на s2
 * 2026-09-06: записи старше 2 дней — 32GB из 64GB общих, при этом записи младше 1 дня — 28GB
 * (живой рабочий кеш нескольких параллельных агентов, трогать не нужно). Тот же порог, что у
 * `next-cache-cleanup.ts` (`MAX_AGE_DAYS = 2`) — симметрично и по смыслу: и там, и здесь это
 * «не пересчитывалось N дней, для дневного цикла разработки неактуально».
 */

import { readdir, rm, stat } from 'fs/promises'
import path from 'path'

export interface NxCacheCleanupResult {
  checkedAt: string
  maxAgeDays: number
  removedCount: number
  removedBytes: number
}

const REPO_PATH = process.env['REPO_PATH'] || '/home/deploy/letar'
/** Порог простоя — сколько дней держать запись `.nx/cache/<hash>`, прежде чем удалить. */
const MAX_AGE_DAYS = Number(process.env['NX_CACHE_CLEANUP_DAYS'] ?? 2)

async function dirSizeBytes(dir: string): Promise<number> {
  let total = 0
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      total += await dirSizeBytes(entryPath)
    } else {
      total += (await stat(entryPath).catch(() => null))?.size ?? 0
    }
  }
  return total
}

export async function runNxCacheCleanup(): Promise<NxCacheCleanupResult> {
  const checkedAt = new Date().toISOString()
  const cacheDir = path.join(REPO_PATH, '.nx', 'cache')
  const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000

  let entries: string[]
  try {
    entries = await readdir(cacheDir)
  } catch (error) {
    console.error(`[NxCacheCleanup] Не удалось прочитать ${cacheDir}:`, error)
    return { checkedAt, maxAgeDays: MAX_AGE_DAYS, removedCount: 0, removedBytes: 0 }
  }

  let removedCount = 0
  let removedBytes = 0

  for (const entry of entries) {
    const entryPath = path.join(cacheDir, entry)

    const entryStats = await stat(entryPath).catch(() => null)
    if (!entryStats?.isDirectory()) {
      continue
    }

    const ageMs = Date.now() - entryStats.mtimeMs
    if (ageMs < maxAgeMs) {
      continue
    }

    try {
      const size = await dirSizeBytes(entryPath)
      await rm(entryPath, { recursive: true, force: true })
      removedCount += 1
      removedBytes += size
    } catch (error) {
      console.error(`[NxCacheCleanup] Не удалось удалить ${entryPath}:`, error)
    }
  }

  if (removedCount > 0) {
    const removedMb = removedBytes / 1024 / 1024
    console.warn(
      `[NxCacheCleanup] Удалено ${removedCount} записей .nx/cache старше ${MAX_AGE_DAYS}д, освобождено ${
        removedMb.toFixed(1)
      }MB`,
    )
  }

  return { checkedAt, maxAgeDays: MAX_AGE_DAYS, removedCount, removedBytes }
}
