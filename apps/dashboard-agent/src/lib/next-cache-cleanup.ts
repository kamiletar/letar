/**
 * Плановая чистка `.next/cache` (инкрементальный webpack/turbopack-кеш Next.js) в чекауте
 * репозитория на хосте — не путать с Docker build cache (`docker-prune.ts`), это отдельный
 * источник места. Замер s2 2026-08-28: суммарно ~34GB, ~85% размера `.next` на приложение,
 * часть не трогалась месяцами (приложения, которые давно не пересобирались/выведены из
 * эксплуатации). Next.js прямым текстом документирует `.next/cache` как безопасный к удалению в
 * любой момент — следующий `next build` просто пересоберёт его с нуля (медленнее на первый раз,
 * без потери функциональности).
 *
 * `WORKSPACE_PATH`/`REPO_PATH` смонтирован в dashboard-agent БЕЗ `:ro` (в отличие от `dashboard`,
 * который получает только read-only копию) — обычный `fs/promises` без nsenter, тот же паттерн,
 * что `tar-backup.ts` использует для каталога бэкапов.
 */

import { readdir, rm, stat } from 'fs/promises'
import path from 'path'

export interface NextCacheCleanupResult {
  checkedAt: string
  maxAgeDays: number
  removed: Array<{ app: string; path: string; ageDays: number }>
}

const REPO_PATH = process.env['REPO_PATH'] || '/home/deploy/letar'
/** Порог простоя — сколько дней держать `.next/cache` без пересборки, прежде чем удалить. */
const MAX_AGE_DAYS = Number(process.env['NEXT_CACHE_CLEANUP_DAYS'] ?? 2)

/**
 * Возраст последней сборки приложения. `BUILD_ID` переписывается каждым `next build` —
 * надёжнее, чем mtime самого каталога `.next/cache` (тот двигается только при добавлении/
 * удалении файлов НЕПОСРЕДСТВЕННО внутри него, не при записи во вложенные подпапки webpack).
 * Нет `BUILD_ID` (Next.js не собирался ни разу, либо это не Next.js-приложение) — откат на mtime
 * самого `.next`, если он есть.
 */
async function getLastBuildAgeDays(appDir: string): Promise<number | null> {
  for (const marker of ['.next/BUILD_ID', '.next']) {
    try {
      const stats = await stat(path.join(appDir, marker))
      return (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24)
    } catch {
      continue
    }
  }
  return null
}

export async function runNextCacheCleanup(): Promise<NextCacheCleanupResult> {
  const checkedAt = new Date().toISOString()
  const appsDir = path.join(REPO_PATH, 'apps')
  const removed: NextCacheCleanupResult['removed'] = []

  let entries: string[]
  try {
    entries = await readdir(appsDir)
  } catch (error) {
    console.error(`[NextCacheCleanup] Не удалось прочитать ${appsDir}:`, error)
    return { checkedAt, maxAgeDays: MAX_AGE_DAYS, removed }
  }

  for (const app of entries) {
    const appDir = path.join(appsDir, app)
    const cacheDir = path.join(appDir, '.next', 'cache')

    const cacheStats = await stat(cacheDir).catch(() => null)
    if (!cacheStats?.isDirectory()) {
      continue
    }

    const ageDays = await getLastBuildAgeDays(appDir)
    if (ageDays === null || ageDays < MAX_AGE_DAYS) {
      continue
    }

    try {
      await rm(cacheDir, { recursive: true, force: true })
      removed.push({ app, path: cacheDir, ageDays: Math.round(ageDays * 10) / 10 })
    } catch (error) {
      console.error(`[NextCacheCleanup] Не удалось удалить ${cacheDir}:`, error)
    }
  }

  if (removed.length > 0) {
    console.warn(
      `[NextCacheCleanup] Удалено ${removed.length} .next/cache старше ${MAX_AGE_DAYS}д: `
        + removed.map((r) => `${r.app} (${r.ageDays}д)`).join(', '),
    )
  }

  return { checkedAt, maxAgeDays: MAX_AGE_DAYS, removed }
}
