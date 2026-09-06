import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * `container.exec()`+`start()` — тот же паттерн мока, что `docker-prune.spec.ts` использует
 * для `docker.modem.dial` (dockerode API мокается на уровне примитивов, не всей библиотеки).
 */
const execStart = vi.fn(async () => {
  const { EventEmitter } = await import('events')
  const stream = new EventEmitter()
  // setTimeout (макротаска), не queueMicrotask — иначе 'end' эмитится ДО того, как код
  // runGarbageCollect успевает подписаться через .on('end', ...) (это происходит уже после
  // resume самого await start(), в следующей микротаске), и подписчик пропускает событие.
  setTimeout(() => stream.emit('end'), 0)
  return stream
})
const execInspect = vi.fn(async () => ({ ExitCode: 0 }))
const containerExec = vi.fn(async () => ({ start: execStart, inspect: execInspect }))
const getContainer = vi.fn(() => ({ exec: containerExec }))

vi.mock('./docker', () => ({
  docker: {
    getContainer: (...args: unknown[]) => getContainer(...(args as [])),
  },
}))

const { runRegistryGc } = await import('./registry-gc')

/** Манифест + config blob одного тега — используется, чтобы собрать fetch-мок по URL. */
function tagFixture(digest: string, created: string): { manifest: unknown; config: unknown } {
  return {
    manifest: { config: { digest: `sha256:cfg-${digest}` } },
    config: { created },
  }
}

/** Строит `fetch`-мок, роутящий по URL/методу — избавляет тесты от ручного перечисления вызовов по порядку. */
function mockFetch(options: {
  catalog: string[]
  tags: Record<string, string[]>
  // repo -> tag -> { manifest, config }
  fixtures: Record<string, Record<string, { manifest: unknown; config: unknown }>>
  deleteOk?: boolean
}) {
  const { catalog, tags, fixtures, deleteOk = true } = options

  return vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'

    if (url.includes('/v2/_catalog')) {
      return jsonResponse({ repositories: catalog })
    }

    const tagsListMatch = /\/v2\/([^/]+)\/tags\/list/.exec(url)
    if (tagsListMatch) {
      const repo = tagsListMatch[1]
      return jsonResponse({ tags: tags[repo] ?? [] })
    }

    const manifestMatch = /\/v2\/([^/]+)\/manifests\/([^/]+)/.exec(url)
    if (manifestMatch) {
      const [, repo, tagOrDigest] = manifestMatch

      if (method === 'DELETE') {
        return deleteOk
          ? { ok: true, status: 202 }
          : { ok: false, status: 404, statusText: 'Not Found' }
      }

      const fixture = fixtures[repo]?.[tagOrDigest]
      if (!fixture) {
        return { ok: false, status: 404 }
      }
      const digestHeader = `sha256:manifest-${tagOrDigest}`
      return jsonResponse(fixture.manifest, { 'docker-content-digest': digestHeader })
    }

    const blobMatch = /\/v2\/([^/]+)\/blobs\/sha256:cfg-([^/]+)/.exec(url)
    if (blobMatch) {
      const [, repo, tagOrDigest] = blobMatch
      const fixture = fixtures[repo]?.[tagOrDigest]
      if (!fixture) {
        return { ok: false, status: 404 }
      }
      return jsonResponse(fixture.config)
    }

    throw new Error(`unmocked fetch: ${method} ${url}`)
  })
}

function jsonResponse(body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  }
}

describe('runRegistryGc', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.stubEnv('REGISTRY_USER', 'admin')
    vi.stubEnv('REGISTRY_PASS', 'secret')
    vi.stubEnv('REGISTRY_URL', 'https://registry.s3.letar.best')
    execStart.mockClear()
    execInspect.mockClear()
    containerExec.mockClear()
    getContainer.mockClear()
  })

  it('бросает, если REGISTRY_USER/REGISTRY_PASS не заданы', async () => {
    vi.stubEnv('REGISTRY_USER', '')
    vi.stubEnv('REGISTRY_PASS', '')

    await expect(runRegistryGc()).rejects.toThrow(/REGISTRY_USER/)
  })

  it('оставляет KEEP_TAGS новых тегов, удаляет остальные, запускает garbage-collect', async () => {
    const fixtures = {
      app: {
        aaa1111: tagFixture('aaa1111', '2026-09-01T00:00:00Z'),
        bbb2222: tagFixture('bbb2222', '2026-09-03T00:00:00Z'),
        ccc3333: tagFixture('ccc3333', '2026-09-02T00:00:00Z'),
        ddd4444: tagFixture('ddd4444', '2026-08-30T00:00:00Z'),
      },
    }
    vi.stubGlobal(
      'fetch',
      mockFetch({
        catalog: ['app'],
        tags: { app: ['latest', 'staging', 'aaa1111', 'bbb2222', 'ccc3333', 'ddd4444'] },
        fixtures,
      }),
    )
    vi.stubEnv('REGISTRY_GC_KEEP_TAGS', '2')

    const result = await runRegistryGc()

    // Новейшие два (bbb2222 09-03, ccc3333 09-02) остаются, aaa1111/ddd4444 — на удаление.
    expect(result.deletedByRepo['app']?.sort()).toEqual(['aaa1111', 'ddd4444'])
    expect(result.tagsDeleted).toBe(2)
    expect(result.dryRun).toBe(false)
    expect(result.garbageCollectRan).toBe(true)
    expect(getContainer).toHaveBeenCalledWith('registry')
    expect(containerExec).toHaveBeenCalledTimes(1)
  })

  it('DRY_RUN не удаляет манифесты и не запускает garbage-collect', async () => {
    const fixtures = {
      app: {
        aaa1111: tagFixture('aaa1111', '2026-09-01T00:00:00Z'),
        bbb2222: tagFixture('bbb2222', '2026-09-03T00:00:00Z'),
      },
    }
    const fetchMock = mockFetch({
      catalog: ['app'],
      tags: { app: ['aaa1111', 'bbb2222'] },
      fixtures,
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('REGISTRY_GC_KEEP_TAGS', '1')
    vi.stubEnv('REGISTRY_GC_DRY_RUN', 'true')

    const result = await runRegistryGc()

    expect(result.dryRun).toBe(true)
    expect(result.tagsDeleted).toBe(1)
    expect(result.garbageCollectRan).toBe(false)
    expect(containerExec).not.toHaveBeenCalled()
    const deleteCalls = fetchMock.mock.calls.filter(([, init]) =>
      (init as RequestInit | undefined)?.method === 'DELETE'
    )
    expect(deleteCalls).toHaveLength(0)
  })

  it('репозиторий без SHA-тегов пропускается без удаления', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        catalog: ['app'],
        tags: { app: ['latest', 'staging'] },
        fixtures: { app: {} },
      }),
    )

    const result = await runRegistryGc()

    expect(result.tagsDeleted).toBe(0)
    expect(result.garbageCollectRan).toBe(false)
    expect(Object.keys(result.deletedByRepo)).toHaveLength(0)
  })

  it('падение DELETE прерывает прогон с ошибкой', async () => {
    const fixtures = {
      app: {
        aaa1111: tagFixture('aaa1111', '2026-09-01T00:00:00Z'),
        bbb2222: tagFixture('bbb2222', '2026-09-03T00:00:00Z'),
      },
    }
    vi.stubGlobal(
      'fetch',
      mockFetch({
        catalog: ['app'],
        tags: { app: ['aaa1111', 'bbb2222'] },
        fixtures,
        deleteOk: false,
      }),
    )
    vi.stubEnv('REGISTRY_GC_KEEP_TAGS', '1')

    await expect(runRegistryGc()).rejects.toThrow(/HTTP 404/)
  })
})
