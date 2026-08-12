import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { readFileSyncMock } = vi.hoisted(() => ({ readFileSyncMock: vi.fn() }))

vi.mock('node:fs', () => ({
  readFileSync: readFileSyncMock,
}))

/** Свежий импорт модуля — обходит модульный кэш `cachedDashboardEnv` между тестами. */
async function importConfig() {
  vi.resetModules()
  return import('./config.js')
}

const ENV_KEYS = ['UMAMI_API_URL', 'UMAMI_API_USER', 'UMAMI_API_PASSWORD'] as const

describe('umami-mcp config', () => {
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

  describe('umamiUrl', () => {
    it('приоритет 1: берёт значение из process.env.UMAMI_API_URL', async () => {
      process.env['UMAMI_API_URL'] = 'https://from-env.example'
      readFileSyncMock.mockReturnValue('UMAMI_API_URL=https://from-file.example')

      const { umamiUrl } = await importConfig()

      expect(umamiUrl()).toBe('https://from-env.example')
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    it('приоритет 2: падает на apps/dashboard/.env.docker, если process.env пуст', async () => {
      readFileSyncMock.mockReturnValue('UMAMI_API_URL=https://from-file.example')

      const { umamiUrl } = await importConfig()

      expect(umamiUrl()).toBe('https://from-file.example')
    })

    it('приоритет 3: дефолт stats.letar.best, если нет ни env, ни файла', async () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const { umamiUrl } = await importConfig()

      expect(umamiUrl()).toBe('https://stats.letar.best')
    })
  })

  describe('umamiUser', () => {
    it('приоритет 3: дефолт admin, если нет ни env, ни файла', async () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const { umamiUser } = await importConfig()

      expect(umamiUser()).toBe('admin')
    })
  })

  describe('umamiPassword', () => {
    it('приоритет 1: берёт значение из process.env.UMAMI_API_PASSWORD', async () => {
      process.env['UMAMI_API_PASSWORD'] = 'env-secret'
      readFileSyncMock.mockReturnValue('UMAMI_API_PASSWORD=file-secret')

      const { umamiPassword } = await importConfig()

      expect(umamiPassword()).toBe('env-secret')
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    it('приоритет 2: падает на apps/dashboard/.env.docker, если process.env пуст', async () => {
      readFileSyncMock.mockReturnValue('UMAMI_API_PASSWORD=file-secret')

      const { umamiPassword } = await importConfig()

      expect(umamiPassword()).toBe('file-secret')
    })

    it('приоритет 3: бросает, если нет ни env, ни файла', async () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const { umamiPassword } = await importConfig()

      expect(() => umamiPassword()).toThrow('UMAMI_API_PASSWORD не найден')
    })
  })
})
