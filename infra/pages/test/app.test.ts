import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../src/app'
import type { PagesConfig } from '../src/config'
import type { OidcClient } from '../src/oidc'
import { createSigned } from '../src/session'
import { PageStorage } from '../src/storage'

const config: PagesConfig = {
  port: 0,
  dataPath: '',
  baseUrl: 'https://pages.test',
  publishToken: 'publish-token-123',
  sessionSecret: 'secret-secret-secret',
  ownerEmails: ['owner@example.com'],
  oidcDiscoveryUrl: 'https://auth.test/.well-known/openid-configuration',
  oidcClientId: 'pages',
  oidcClientSecret: 'client-secret',
  maxVersionBytes: 1000,
  maxFiles: 5,
}

const oidc: OidcClient = {
  startLogin: async () => ({ url: 'https://auth.test/authorize?x=1', state: 'st1', verifier: 'v1' }),
  finishLogin: async (code) => ({
    email: code === 'owner' ? 'Owner@Example.com'.toLowerCase() : 'x@x.com',
    verified: true,
  }),
}

let dir: string
let handle: (req: Request) => Promise<Response>

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'pages-'))
  const storage = new PageStorage(dir, { maxVersionBytes: config.maxVersionBytes, maxFiles: config.maxFiles })
  handle = createApp({ ...config, dataPath: dir }, storage, oidc)
})
afterEach(() => rm(dir, { recursive: true, force: true }))

const auth = { authorization: `Bearer ${config.publishToken}`, 'content-type': 'application/json' }
const ownerCookie = () =>
  `pages_session=${encodeURIComponent(createSigned({ email: 'owner@example.com' }, config.sessionSecret, 60))}`

function publish(slug: string, body: unknown, headers: Record<string, string> = auth) {
  return handle(
    new Request(`https://pages.test/api/pages/${slug}`, { method: 'POST', headers, body: JSON.stringify(body) }),
  )
}

const page = (html: string, extra: Record<string, unknown> = {}) => ({
  title: 'Тест',
  description: 'описание',
  files: { 'index.html': { text: html } },
  ...extra,
})

describe('публикация', () => {
  test('без токена отказ', async () => {
    const res = await publish('plan', page('<p>1</p>'), { 'content-type': 'application/json' })
    expect(res.status).toBe(401)
  })

  test('первая версия, затем вторая в тот же slug', async () => {
    const first = await (await publish('plan', page('<p>1</p>'))).json()
    expect(first).toMatchObject({ slug: 'plan', version: 1, url: 'https://pages.test/p/plan/' })
    const second = await (await publish('plan', page('<p>2</p>'))).json()
    expect(second.version).toBe(2)

    const current = await handle(new Request('https://pages.test/p/plan/', { headers: { cookie: ownerCookie() } }))
    expect(await current.text()).toBe('<p>2</p>')
    const old = await handle(new Request('https://pages.test/p/plan/v/1/', { headers: { cookie: ownerCookie() } }))
    expect(await old.text()).toBe('<p>1</p>')
  })

  test('нет index.html, плохой slug и путь с .. отвергаются', async () => {
    expect((await publish('plan', { title: 't', files: { 'a.html': { text: 'x' } } })).status).toBe(400)
    expect((await publish('Bad_Slug', page('x'))).status).toBe(400)
    expect(
      (await publish('plan', { title: 't', files: { 'index.html': { text: 'x' }, '../evil.html': { text: 'x' } } }))
        .status,
    ).toBe(400)
  })

  test('лимиты размера и числа файлов', async () => {
    expect((await publish('big', page('x'.repeat(1001)))).status).toBe(413)
    const many = Object.fromEntries(
      Array.from({ length: 6 }, (_, i) => [i === 0 ? 'index.html' : `f${i}.txt`, { text: 'x' }]),
    )
    expect((await publish('many', { title: 't', files: many })).status).toBe(413)
  })

  test('файлы рядом со страницей отдаются, base64 тоже', async () => {
    await publish('doc', {
      title: 't',
      files: {
        'index.html': { text: '<img src="a.bin">' },
        'a.bin': { base64: Buffer.from([1, 2, 3]).toString('base64') },
      },
    })
    const res = await handle(new Request('https://pages.test/p/doc/a.bin', { headers: { cookie: ownerCookie() } }))
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })
})

describe('доступ', () => {
  test('приватная страница без входа ведёт на /login', async () => {
    await publish('plan', page('<p>1</p>'))
    const res = await handle(new Request('https://pages.test/p/plan/'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/login?next=%2Fp%2Fplan%2F')
  })

  test('чужая сессия и подделанная подпись не пускают', async () => {
    await publish('plan', page('<p>1</p>'))
    const stranger = `pages_session=${encodeURIComponent(createSigned({ email: 'x@x.com' }, config.sessionSecret, 60))}`
    expect((await handle(new Request('https://pages.test/p/plan/', { headers: { cookie: stranger } }))).status).toBe(
      302,
    )
    const forged = `pages_session=${
      encodeURIComponent(createSigned({ email: 'owner@example.com' }, 'other-secret', 60))
    }`
    expect((await handle(new Request('https://pages.test/p/plan/', { headers: { cookie: forged } }))).status).toBe(302)
  })

  test('публичная страница открыта без входа, CSP и nosniff стоят', async () => {
    await publish('open', page('<p>1</p>', { public: true }))
    const res = await handle(new Request('https://pages.test/p/open/'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-security-policy')).toContain('https://cdnjs.cloudflare.com')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy')).toContain('sandbox allow-scripts')
  })

  test('закрытая страница без sandbox, чтобы работали её файлы с cookie входа', async () => {
    await publish('plan', page('<p>1</p>'))
    const res = await handle(new Request('https://pages.test/p/plan/', { headers: { cookie: ownerCookie() } }))
    expect(res.headers.get('content-security-policy')).not.toContain('sandbox')
  })

  test('обход каталога через /p/slug/..%2f отдаёт 404', async () => {
    await publish('plan', page('<p>1</p>'))
    const res = await handle(
      new Request('https://pages.test/p/plan/..%2fmeta.json', { headers: { cookie: ownerCookie() } }),
    )
    expect(res.status).toBe(404)
  })
})

describe('вход', () => {
  test('/login перенаправляет в Ключницу и ставит cookie состояния', async () => {
    const res = await handle(new Request('https://pages.test/login?next=/p/plan/'))
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('https://auth.test/authorize?x=1')
    expect(res.headers.get('set-cookie')).toContain('pages_oauth=')
  })

  test('callback: свой email получает сессию и возврат на страницу', async () => {
    const login = await handle(new Request('https://pages.test/login?next=/p/plan/'))
    const stateCookie = login.headers.get('set-cookie')!.split(';')[0]!
    const res = await handle(
      new Request('https://pages.test/auth/callback?code=owner&state=st1', { headers: { cookie: stateCookie } }),
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/p/plan/')
    expect(res.headers.get('set-cookie')).toContain('pages_session=')
  })

  test('callback: чужой email и неверное состояние отвергаются', async () => {
    const login = await handle(new Request('https://pages.test/login'))
    const stateCookie = login.headers.get('set-cookie')!.split(';')[0]!
    expect(
      (await handle(
        new Request('https://pages.test/auth/callback?code=other&state=st1', { headers: { cookie: stateCookie } }),
      )).status,
    ).toBe(403)
    expect(
      (await handle(
        new Request('https://pages.test/auth/callback?code=owner&state=wrong', { headers: { cookie: stateCookie } }),
      )).status,
    ).toBe(400)
  })

  test('next не может увести на другой сайт', async () => {
    for (
      const next of [
        '//evil.com',
        '/%09/evil.com',
        '/%0d%0a/evil.com',
        '/\\evil.com',
        'https://evil.com',
        '/.//evil.com',
        '/..//evil.com',
        '/%2e//evil.com',
        '/a/..//evil.com',
      ]
    ) {
      const login = await handle(new Request(`https://pages.test/login?next=${next}`))
      const stateCookie = login.headers.get('set-cookie')!.split(';')[0]!
      const res = await handle(
        new Request('https://pages.test/auth/callback?code=owner&state=st1', { headers: { cookie: stateCookie } }),
      )
      expect(res.headers.get('location')).toBe('/')
    }
  })
})

describe('список и удаление', () => {
  test('список только по токену, удаление убирает страницу', async () => {
    await publish('plan', page('<p>1</p>'))
    expect((await handle(new Request('https://pages.test/api/pages'))).status).toBe(401)
    const list = await (await handle(new Request('https://pages.test/api/pages', { headers: auth }))).json()
    expect(list.pages.map((p: { slug: string }) => p.slug)).toEqual(['plan'])
    const del = await handle(new Request('https://pages.test/api/pages/plan', { method: 'DELETE', headers: auth }))
    expect(del.status).toBe(200)
    expect((await handle(new Request('https://pages.test/p/plan/', { headers: { cookie: ownerCookie() } }))).status)
      .toBe(404)
  })
})
