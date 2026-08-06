import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { requireDevSessionToken, storagePaths } from './staging-auth'

describe('storagePaths', () => {
  it('возвращает пути и в configDir, и в CWD, когда они различаются', () => {
    const e2eRoot = resolve(process.cwd(), '..')

    const paths = storagePaths(e2eRoot, 'admin.json')

    expect(paths).toEqual([
      resolve(e2eRoot, 'playwright/.auth/admin.json'),
      resolve(process.cwd(), 'playwright/.auth/admin.json'),
    ])
  })

  it('возвращает единственный путь, когда e2eRoot совпадает с CWD', () => {
    const e2eRoot = process.cwd()

    const paths = storagePaths(e2eRoot, 'admin.json')

    expect(paths).toEqual([resolve(process.cwd(), 'playwright/.auth/admin.json')])
  })

  it('подставляет переданное имя файла в путь', () => {
    const e2eRoot = resolve(process.cwd(), '..')

    const paths = storagePaths(e2eRoot, 'user.json')

    expect(paths[0]).toMatch(/playwright[/\\]\.auth[/\\]user\.json$/)
  })
})

describe('requireDevSessionToken', () => {
  const originalToken = process.env['DEV_SESSION_TOKEN']

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env['DEV_SESSION_TOKEN']
    } else {
      process.env['DEV_SESSION_TOKEN'] = originalToken
    }
  })

  it('возвращает значение переменной окружения, если оно задано', () => {
    process.env['DEV_SESSION_TOKEN'] = 'test-token-value'

    expect(requireDevSessionToken()).toBe('test-token-value')
  })

  it('бросает понятную ошибку, если переменная не задана', () => {
    delete process.env['DEV_SESSION_TOKEN']

    expect(() => requireDevSessionToken()).toThrow(
      '[globalSetup:staging] DEV_SESSION_TOKEN не задан — dev-session вернёт 403',
    )
  })

  it('бросает ошибку, если переменная задана пустой строкой', () => {
    process.env['DEV_SESSION_TOKEN'] = ''

    expect(() => requireDevSessionToken()).toThrow()
  })
})
