import { describe, expect, it } from 'vitest'
import type { CommandResult, DeployEngineExecutor } from './executor.js'
import { appendManifestEntry, entryBySha, latestEntry, manifestPath, readManifest } from './manifest.js'
import type { DeployManifestEntry } from './types.js'

function memoryExecutor(files: Record<string, string> = {}): DeployEngineExecutor {
  const store = new Map(Object.entries(files))
  return {
    runCommand(): Promise<CommandResult> {
      throw new Error('runCommand не используется в тестах manifest')
    },
    async readFile(path) {
      return store.has(path) ? store.get(path)! : null
    },
    async writeFile(path, content) {
      store.set(path, content)
    },
    async fileExists(path) {
      return store.has(path)
    },
  }
}

function entry(overrides: Partial<DeployManifestEntry> = {}): DeployManifestEntry {
  return {
    deployId: 'deploy-1',
    sha: 'a'.repeat(40),
    imageTag: 'grandslamcup:aaaaaaa',
    migrationsApplied: [],
    timestamp: '2026-07-11T12:00:00.000Z',
    ...overrides,
  }
}

describe('readManifest', () => {
  it('возвращает пустую историю, если файла ещё нет', async () => {
    const executor = memoryExecutor()
    const manifest = await readManifest(executor, 'time')

    expect(manifest).toEqual({ app: 'time', entries: [] })
  })

  it('бросает на повреждённом JSON', async () => {
    const executor = memoryExecutor({ [manifestPath('time')]: '{not json' })

    await expect(readManifest(executor, 'time')).rejects.toThrow(/не JSON/)
  })

  it('бросает, если JSON не соответствует схеме', async () => {
    const executor = memoryExecutor({
      [manifestPath('time')]: JSON.stringify({ app: 'time', entries: [{ bad: true }] }),
    })

    await expect(readManifest(executor, 'time')).rejects.toThrow(/Повреждён deploy-manifest/)
  })
})

describe('appendManifestEntry / latestEntry / entryBySha', () => {
  it('дописывает записи по порядку и находит последнюю/по sha', async () => {
    const executor = memoryExecutor()

    await appendManifestEntry(executor, 'time', entry({ deployId: 'deploy-1', sha: 'a'.repeat(40) }))
    const manifest = await appendManifestEntry(
      executor,
      'time',
      entry({ deployId: 'deploy-2', sha: 'b'.repeat(40), timestamp: '2026-07-12T09:00:00.000Z' }),
    )

    expect(manifest.entries).toHaveLength(2)
    expect(latestEntry(manifest)?.deployId).toBe('deploy-2')
    expect(entryBySha(manifest, 'a'.repeat(40))?.deployId).toBe('deploy-1')
    expect(entryBySha(manifest, 'c'.repeat(40))).toBeNull()

    // и персистится — повторное чтение видит те же данные
    const reread = await readManifest(executor, 'time')
    expect(reread).toEqual(manifest)
  })

  it('latestEntry возвращает null для пустой истории', () => {
    expect(latestEntry({ app: 'time', entries: [] })).toBeNull()
  })
})
