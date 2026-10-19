import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createKeystaticConfig } from '../../../keystatic.config'
import { KeystaticApp } from './keystatic'

const { makePage, renderPage } = vi.hoisted(() => {
  const renderPage = vi.fn()
  return {
    renderPage,
    makePage: vi.fn((config: unknown) => () => {
      renderPage(config)
      return null
    }),
  }
})

vi.mock('@keystatic/next/ui/app', () => ({ makePage }))
vi.mock('server-only', () => ({}))

describe('режим хранилища Keystatic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('использует серверный GitHub-режим в браузере без приватных env', () => {
    vi.stubEnv('KEYSTATIC_GITHUB_CLIENT_ID', '')
    try {
      render(<KeystaticApp storageKind="github" />)
      expect(renderPage).toHaveBeenCalledWith(expect.objectContaining({
        storage: expect.objectContaining({ kind: 'github' }),
        collections: expect.objectContaining({ posts: expect.objectContaining({ path: 'content/posts/*' }) }),
      }))
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it.each(['github', 'local'] as const)('сохраняет страницу CMS при повторном рендере: %s', (storageKind) => {
    const view = render(<KeystaticApp storageKind={storageKind} />)
    view.rerender(<KeystaticApp storageKind={storageKind} />)
    expect(makePage).not.toHaveBeenCalled()
    expect(renderPage).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['client-id', 'github', 'content/posts/*'],
    ['', 'local', 'src/content/posts/*'],
  ])('выбирает одинаковый режим и путь для API и клиента: %s', async (clientId, kind, path) => {
    vi.stubEnv('KEYSTATIC_GITHUB_CLIENT_ID', clientId)
    try {
      const { keystaticConfig, keystaticStorageKind } = await import('../../lib/keystatic-config')
      expect(keystaticConfig.storage.kind).toBe(kind)
      expect(keystaticConfig.collections.posts.path).toBe(path)
      const browserConfig = createKeystaticConfig(keystaticStorageKind)
      expect(browserConfig.storage).toEqual(keystaticConfig.storage)
      expect(browserConfig.collections.posts.path).toBe(path)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
