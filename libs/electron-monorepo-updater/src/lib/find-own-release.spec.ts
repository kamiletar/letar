import { describe, expect, it, vi } from 'vitest'

import { findOwnLatestTag, type MinimalFetch } from './find-own-release'

function mockFetch(releases: unknown[], status = 200): MinimalFetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(releases),
  }) as unknown as MinimalFetch
}

describe('findOwnLatestTag', () => {
  const baseOptions = {
    owner: 'kamiletar',
    repo: 'letar',
    tagPrefix: 'animatrona-v',
    userAgent: 'test-client',
  }

  it('находит первый релиз с нужным префиксом тега', async () => {
    const fetchFn = mockFetch([
      { tag_name: 'kami-key-the-v1.7.4', draft: false, prerelease: false },
      { tag_name: 'animatrona-v0.55.72', draft: false, prerelease: false },
      { tag_name: 'animatrona-v0.55.71', draft: false, prerelease: false },
    ])

    const tag = await findOwnLatestTag({ ...baseOptions, fetchFn })

    expect(tag).toBe('animatrona-v0.55.72')
  })

  it('пропускает draft и prerelease релизы', async () => {
    const fetchFn = mockFetch([
      { tag_name: 'animatrona-v0.55.73', draft: true, prerelease: false },
      { tag_name: 'animatrona-v0.55.72', draft: false, prerelease: true },
      { tag_name: 'animatrona-v0.55.71', draft: false, prerelease: false },
    ])

    const tag = await findOwnLatestTag({ ...baseOptions, fetchFn })

    expect(tag).toBe('animatrona-v0.55.71')
  })

  it('возвращает null, если своих релизов нет', async () => {
    const fetchFn = mockFetch([{ tag_name: 'kami-key-the-v1.7.4', draft: false, prerelease: false }])

    const tag = await findOwnLatestTag({ ...baseOptions, fetchFn })

    expect(tag).toBeNull()
  })

  it('бросает ошибку при не-2xx ответе GitHub API', async () => {
    const fetchFn = mockFetch([], 403)

    await expect(findOwnLatestTag({ ...baseOptions, fetchFn })).rejects.toThrow('403')
  })

  it('передаёт User-Agent и Accept заголовки, требуемые GitHub API', async () => {
    const fetchFn = mockFetch([])

    await findOwnLatestTag({ ...baseOptions, fetchFn })

    expect(fetchFn).toHaveBeenCalledWith(
      expect.stringContaining('https://api.github.com/repos/kamiletar/letar/releases'),
      expect.objectContaining({
        headers: { 'User-Agent': 'test-client', Accept: 'application/vnd.github+json' },
      }),
    )
  })
})
