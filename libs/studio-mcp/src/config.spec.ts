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

const ENV_KEYS = ['STUDIO_URL', 'ADMIN_MCP_SECRET'] as const

describe('studio-mcp config', () => {
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

  describe('studioUrl', () => {
    it('приоритет 1: берёт значение из process.env.STUDIO_URL', async () => {
      process.env['STUDIO_URL'] = 'https://from-env.example'
      readFileSyncMock.mockReturnValue('STUDIO_URL=https://from-file.example')

      const { studioUrl } = await importConfig()

      expect(studioUrl()).toBe('https://from-env.example')
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    it('приоритет 2: падает на apps/studio/.env.local, если process.env пуст', async () => {
      readFileSyncMock.mockReturnValue('STUDIO_URL=https://from-file.example')

      const { studioUrl } = await importConfig()

      expect(studioUrl()).toBe('https://from-file.example')
    })

    it('приоритет 3: дефолт localhost:3024, если нет ни env, ни файла', async () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const { studioUrl } = await importConfig()

      expect(studioUrl()).toBe('http://localhost:3024')
    })
  })

  describe('adminMcpSecret', () => {
    it('приоритет 1: берёт значение из process.env.ADMIN_MCP_SECRET', async () => {
      process.env['ADMIN_MCP_SECRET'] = 'env-secret'
      readFileSyncMock.mockReturnValue('ADMIN_MCP_SECRET=file-secret')

      const { adminMcpSecret } = await importConfig()

      expect(adminMcpSecret()).toBe('env-secret')
      expect(readFileSyncMock).not.toHaveBeenCalled()
    })

    it('приоритет 2: падает на apps/studio/.env.local, если process.env пуст', async () => {
      readFileSyncMock.mockReturnValue('ADMIN_MCP_SECRET=file-secret')

      const { adminMcpSecret } = await importConfig()

      expect(adminMcpSecret()).toBe('file-secret')
    })

    it('приоритет 3: бросает, если нет ни env, ни файла', async () => {
      readFileSyncMock.mockImplementation(() => {
        throw new Error('ENOENT')
      })

      const { adminMcpSecret } = await importConfig()

      expect(() => adminMcpSecret()).toThrow('ADMIN_MCP_SECRET не найден')
    })
  })
})
