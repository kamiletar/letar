import { describe, expect, it, vi } from 'vitest'

import type { MinimalFetch } from './find-own-release'
import { pointFeedAtOwnRelease } from './point-feed-at-own-release'

function mockFetch(releases: unknown[]): MinimalFetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(releases),
  }) as unknown as MinimalFetch
}

describe('pointFeedAtOwnRelease', () => {
  const baseOptions = {
    owner: 'kamiletar',
    repo: 'letar',
    tagPrefix: 'animatrona-v',
    userAgent: 'test-client',
  }

  it('направляет autoUpdater на generic-фид найденного релиза', async () => {
    const setFeedURL = vi.fn()
    const fetchFn = mockFetch([{ tag_name: 'animatrona-v0.55.72', draft: false, prerelease: false }])

    const found = await pointFeedAtOwnRelease({ setFeedURL }, { ...baseOptions, fetchFn })

    expect(found).toBe(true)
    expect(setFeedURL).toHaveBeenCalledWith({
      provider: 'generic',
      url: 'https://github.com/kamiletar/letar/releases/download/animatrona-v0.55.72',
    })
  })

  it('не трогает autoUpdater и возвращает false, если своего релиза нет', async () => {
    const setFeedURL = vi.fn()
    const onNotFound = vi.fn()
    const fetchFn = mockFetch([])

    const found = await pointFeedAtOwnRelease({ setFeedURL }, { ...baseOptions, fetchFn, onNotFound })

    expect(found).toBe(false)
    expect(setFeedURL).not.toHaveBeenCalled()
    expect(onNotFound).toHaveBeenCalledWith(expect.stringContaining('animatrona-v'))
  })
})
