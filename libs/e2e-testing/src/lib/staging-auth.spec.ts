import type { Browser } from '@playwright/test'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openDevSessionPage, requireDevSessionToken, storagePaths } from './staging-auth'

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

describe('openDevSessionPage', () => {
  const baseURL = 'https://app.example.test'

  /** Фейковый Browser: goto «переходит» на `finalUrl` со статусом `status` */
  function createBrowser(options: { status?: number; finalUrl: string; noResponse?: boolean }) {
    const { status = 200, finalUrl, noResponse = false } = options
    const calls: string[] = []
    const page = {
      goto: vi.fn(async (_url: string) => {
        calls.push('goto')
        return noResponse ? null : { ok: () => status >= 200 && status < 300, status: () => status }
      }),
      url: vi.fn(() => finalUrl),
      context: vi.fn(),
    }
    const context = {
      newPage: vi.fn(async () => page),
      close: vi.fn(async () => {}),
    }
    page.context.mockReturnValue(context)
    const browser = { newContext: vi.fn(async () => context) }
    return { browser: browser as unknown as Browser, browserMock: browser, context, page, calls }
  }

  it('создаёт контекст с baseURL и локалью, логинится по токену и возвращает страницу', async () => {
    const { browser, browserMock, context, page } = createBrowser({ finalUrl: `${baseURL}/admin/paper-types` })

    const result = await openDevSessionPage({ browser, baseURL, token: 'tok', redirect: '/admin/paper-types' })

    expect(result).toBe(page)
    expect(browserMock.newContext).toHaveBeenCalledWith({ baseURL, locale: 'ru-RU' })
    const url = new URL(`${baseURL}${page.goto.mock.calls[0]?.[0]}`)
    expect(url.pathname).toBe('/api/auth/dev-session')
    expect(url.searchParams.get('token')).toBe('tok')
    expect(url.searchParams.get('redirect')).toBe('/admin/paper-types')
    expect(url.searchParams.has('email')).toBe(false)
    expect(context.close).not.toHaveBeenCalled()
  })

  it('передаёт email и свою локаль, если они заданы', async () => {
    const { browser, browserMock, page } = createBrowser({ finalUrl: `${baseURL}/admin` })

    await openDevSessionPage({
      browser,
      baseURL,
      token: 'tok',
      redirect: '/admin',
      email: 'e2e-admin@example.test',
      locale: 'en-US',
    })

    expect(browserMock.newContext).toHaveBeenCalledWith({ baseURL, locale: 'en-US' })
    const url = new URL(`${baseURL}${page.goto.mock.calls[0]?.[0]}`)
    expect(url.searchParams.get('email')).toBe('e2e-admin@example.test')
  })

  it('вызывает prepare до перехода на dev-session', async () => {
    const { browser, calls } = createBrowser({ finalUrl: `${baseURL}/admin` })
    const prepare = vi.fn(async () => {
      calls.push('prepare')
    })

    await openDevSessionPage({ browser, baseURL, token: 'tok', redirect: '/admin', prepare })

    expect(calls).toEqual(['prepare', 'goto'])
  })

  it('принимает финальный адрес с хвостовым слэшем и вложенной страницей', async () => {
    const { browser } = createBrowser({ finalUrl: `${baseURL}/admin/leads/` })

    await expect(openDevSessionPage({ browser, baseURL, token: 'tok', redirect: '/admin/' })).resolves.toBeDefined()
  })

  it('бросает ошибку и закрывает контекст, если dev-session вернул 403', async () => {
    // Адрес 403-ответа тоже содержит redirect=/admin — проверка только по URL дала бы ложный успех
    const { browser, context } = createBrowser({
      status: 403,
      finalUrl: `${baseURL}/api/auth/dev-session?redirect=/admin`,
    })

    await expect(openDevSessionPage({ browser, baseURL, token: 'bad', redirect: '/admin' })).rejects.toThrow(
      'HTTP 403',
    )
    expect(context.close).toHaveBeenCalledTimes(1)
  })

  it('бросает ошибку и закрывает контекст, если ответа нет', async () => {
    const { browser, context } = createBrowser({ noResponse: true, finalUrl: `${baseURL}/admin` })

    await expect(openDevSessionPage({ browser, baseURL, token: 'tok', redirect: '/admin' })).rejects.toThrow(
      'нет ответа',
    )
    expect(context.close).toHaveBeenCalledTimes(1)
  })

  it('бросает ошибку и закрывает контекст, если оказались не на ожидаемой странице', async () => {
    const { browser, context } = createBrowser({ finalUrl: `${baseURL}/signin` })

    await expect(openDevSessionPage({ browser, baseURL, token: 'tok', redirect: '/admin/paper-types' })).rejects
      .toThrow("ждали страницу '/admin/paper-types', оказались на '/signin'")
    expect(context.close).toHaveBeenCalledTimes(1)
  })
})
