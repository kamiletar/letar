import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLatestRelease, fetchReleases } from './fetch-releases'

const mockRelease = (tag: string, draft = false, prerelease = false) => ({
  tag_name: tag,
  published_at: '2026-01-01T00:00:00Z',
  body: '',
  draft,
  prerelease,
  assets: [],
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchLatestRelease', () => {
  it('без tagPrefix бьёт в /releases/latest напрямую', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => mockRelease('v1.0.0') })
    vi.stubGlobal('fetch', fetchMock)

    const release = await fetchLatestRelease({ owner: 'kamiletar', repo: 'aira' })

    expect(release?.tag_name).toBe('v1.0.0')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/kamiletar/aira/releases/latest',
      expect.anything()
    )
  })

  it('с tagPrefix берёт первый релиз из списка с совпадающим префиксом', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        mockRelease('other-app-v2.0.0'),
        mockRelease('animatrona-v1.5.0'),
        mockRelease('animatrona-v1.4.0'),
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    const release = await fetchLatestRelease({ owner: 'kamiletar', repo: 'letar', tagPrefix: 'animatrona-v' })

    expect(release?.tag_name).toBe('animatrona-v1.5.0')
  })

  it('возвращает null на неуспешный ответ', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const release = await fetchLatestRelease({ owner: 'kamiletar', repo: 'aira' })

    expect(release).toBeNull()
  })

  it('возвращает null при сетевой ошибке', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    const release = await fetchLatestRelease({ owner: 'kamiletar', repo: 'aira' })

    expect(release).toBeNull()
  })
})

describe('fetchReleases', () => {
  it('отфильтровывает draft и prerelease', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [mockRelease('v3', true), mockRelease('v2', false, true), mockRelease('v1')],
      })
    )

    const releases = await fetchReleases({ owner: 'kamiletar', repo: 'aira' })

    expect(releases.map((r) => r.tag_name)).toEqual(['v1'])
  })

  it('возвращает пустой массив на неуспешный ответ', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    const releases = await fetchReleases({ owner: 'kamiletar', repo: 'aira' })

    expect(releases).toEqual([])
  })
})
