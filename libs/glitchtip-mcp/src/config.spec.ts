import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { readFileSyncMock } = vi.hoisted(() => ({ readFileSyncMock: vi.fn() }))

vi.mock('node:fs', () => ({
  readFileSync: readFileSyncMock,
}))

/** Свежий импорт модуля — обходит модульный кэш `cachedLocalEnv` между тестами. */
async function importConfig() {
  vi.resetModules()
  return import('./config.js')
}

const ENV_KEYS = ['GLITCHTIP_BASE_URL', 'GLITCHTIP_ORG', 'GLITCHTIP_API_TOKEN'] as const

describe('glitchtip-mcp config', () => {
  let originalEnv: Record<string, string | undefined>

  beforeEach(() => {
    originalEnv = {}
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key]
      delete process.env[key]
    }
    readFileSyncMock.mockReset()
  })

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = originalEnv[key]
      }
    }
  })

  describe('glitchtipUrl', () => {
    it('приоритет 1: берёт значение из process.env.GLITCHTIP_BASE_URL', async () => {
      process.env['GLITCHTIP_BASE_URL'] = 'https://from-env.example'
      readFileSyncMock.mockReturnValue('GLITCHTIP_BASE_URL=https://from-file.example')

      const { glitchtipUrl } = await importConfig()

      expect(glitchtipUrl()).toBe('https://from-env.example')
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    it('приоритет 2: падает на infra/glitchtip/.env.local, если process.env пуст', async () => {
      readFileSyncMock.mockReturnValue('GLITCHTIP_BASE_URL=https://from-file.example')

      const { glitchtipUrl } = await importConfig()

      expect(glitchtipUrl()).toBe('https://from-file.example')
    })

    it('приоритет 3: дефолт errors.s3.letar.best, если нет ни env, ни файла', async () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const { glitchtipUrl } = await importConfig()

      expect(glitchtipUrl()).toBe('https://errors.s3.letar.best')
    })
  })

  describe('glitchtipOrg', () => {
    it('приоритет 1: берёт значение из process.env.GLITCHTIP_ORG', async () => {
      process.env['GLITCHTIP_ORG'] = 'env-org'
      readFileSyncMock.mockReturnValue('GLITCHTIP_ORG=file-org')

      const { glitchtipOrg } = await importConfig()

      expect(glitchtipOrg()).toBe('env-org')
    })

    it('приоритет 3: бросает, если нет ни env, ни файла', async () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const { glitchtipOrg } = await importConfig()

      expect(() => glitchtipOrg()).toThrow('GLITCHTIP_ORG не найден')
    })
  })

  describe('glitchtipToken', () => {
    it('приоритет 1: берёт значение из process.env.GLITCHTIP_API_TOKEN', async () => {
      process.env['GLITCHTIP_API_TOKEN'] = 'env-secret'
      readFileSyncMock.mockReturnValue('GLITCHTIP_API_TOKEN=file-secret')

      const { glitchtipToken } = await importConfig()

      expect(glitchtipToken()).toBe('env-secret')
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    it('приоритет 2: падает на infra/glitchtip/.env.local, если process.env пуст', async () => {
      readFileSyncMock.mockReturnValue('GLITCHTIP_API_TOKEN=file-secret')

      const { glitchtipToken } = await importConfig()

      expect(glitchtipToken()).toBe('file-secret')
    })

    it('приоритет 3: бросает, если нет ни env, ни файла', async () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const { glitchtipToken } = await importConfig()

      expect(() => glitchtipToken()).toThrow('GLITCHTIP_API_TOKEN не найден')
    })
  })
})
