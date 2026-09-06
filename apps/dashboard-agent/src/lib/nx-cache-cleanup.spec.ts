import { mkdir, mkdtemp, rm, utimes, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

let repoPath: string

beforeEach(async () => {
  repoPath = await mkdtemp(path.join(tmpdir(), 'nx-cache-cleanup-'))
  process.env['REPO_PATH'] = repoPath
  process.env['NX_CACHE_CLEANUP_DAYS'] = '2'
})

afterEach(async () => {
  await rm(repoPath, { recursive: true, force: true })
  delete process.env['REPO_PATH']
  delete process.env['NX_CACHE_CLEANUP_DAYS']
})

/** Заводит `.nx/<cacheDirName>/<hash>` с файлом внутри и выставляет mtime вручную (readdir его не трогает). */
async function makeCacheEntry(
  hash: string,
  ageDays: number,
  fileContent = 'x',
  cacheDirName = 'cache',
): Promise<void> {
  const entryDir = path.join(repoPath, '.nx', cacheDirName, hash)
  await mkdir(entryDir, { recursive: true })
  await writeFile(path.join(entryDir, 'terminalOutput'), fileContent)
  const mtime = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000)
  await utimes(entryDir, mtime, mtime)
}

describe('runNxCacheCleanup', () => {
  it('удаляет записи старше порога, свежие оставляет', async () => {
    await makeCacheEntry('old-hash', 5)
    await makeCacheEntry('fresh-hash', 0.5)

    const { runNxCacheCleanup } = await import(`./nx-cache-cleanup?t=${Date.now()}`)
    const result = await runNxCacheCleanup()

    expect(result.removedCount).toBe(1)
    expect(result.removedBytes).toBeGreaterThan(0)

    const remaining = await import('fs/promises').then((m) => m.readdir(path.join(repoPath, '.nx', 'cache')))
    expect(remaining).toEqual(['fresh-hash'])
  })

  it('нет .nx/cache — нули, без падения', async () => {
    const { runNxCacheCleanup } = await import(`./nx-cache-cleanup?t=${Date.now()}`)
    const result = await runNxCacheCleanup()

    expect(result.removedCount).toBe(0)
    expect(result.removedBytes).toBe(0)
  })

  it('все записи свежие — ничего не удаляет', async () => {
    await makeCacheEntry('a', 0.1)
    await makeCacheEntry('b', 1)

    const { runNxCacheCleanup } = await import(`./nx-cache-cleanup?t=${Date.now()}`)
    const result = await runNxCacheCleanup()

    expect(result.removedCount).toBe(0)
  })

  it('обходит все .nx/cache* — cache, cache-staging, cache-prod разом (PLAN-INFRA-6.md §157 задача №1)', async () => {
    await makeCacheEntry('old-in-default', 5, 'x', 'cache')
    await makeCacheEntry('old-in-staging', 5, 'x', 'cache-staging')
    await makeCacheEntry('old-in-prod', 5, 'x', 'cache-prod')
    await makeCacheEntry('fresh-in-prod', 0.5, 'x', 'cache-prod')

    const { runNxCacheCleanup } = await import(`./nx-cache-cleanup?t=${Date.now()}`)
    const result = await runNxCacheCleanup()

    expect(result.removedCount).toBe(3)
    expect(result.removedBytes).toBeGreaterThan(0)

    const { readdir } = await import('fs/promises')
    expect(await readdir(path.join(repoPath, '.nx', 'cache')).catch(() => [])).toEqual([])
    expect(await readdir(path.join(repoPath, '.nx', 'cache-staging')).catch(() => [])).toEqual([])
    expect(await readdir(path.join(repoPath, '.nx', 'cache-prod'))).toEqual(['fresh-in-prod'])
  })
})
