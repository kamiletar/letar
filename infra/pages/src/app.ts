import { timingSafeEqual } from 'node:crypto'
import type { PagesConfig } from './config'
import type { OidcClient } from './oidc'
import { clearCookieHeader, cookieHeader, createSigned, parseCookies, verifySigned } from './session'
import { PageError, PageStorage } from './storage'

/** HTTP-слой сервиса: чистая функция `Request → Response`, без привязки к Bun.serve (удобно в тестах). */

const SESSION_COOKIE = 'pages_session'
const STATE_COOKIE = 'pages_oauth'
const SESSION_TTL = 30 * 24 * 3600
const STATE_TTL = 10 * 60

/** CSP как у Artifact: скрипты только с трёх CDN, шрифты с Google Fonts, остальное своё или inline. */
const PAGE_CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com data:',
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join('; ')

const BASE_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'same-origin',
  'x-frame-options': 'DENY',
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: BASE_HEADERS })
}

function bearerOk(req: Request, token: string): boolean {
  const given = Buffer.from(req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '')
  const wanted = Buffer.from(token)
  return given.length === wanted.length && timingSafeEqual(given, wanted)
}

/** Возвращаться после входа можно только на путь этого же сервиса. */
function safeNext(value: string | null): string {
  // Управляющие символы (табуляция, перевод строки) браузер вырезает из адреса: `/\t/evil.com` стал бы `//evil.com`
  if (!value || /[\x00-\x1f\x7f\\]/.test(value) || !value.startsWith('/') || value.startsWith('//')) {
    return '/'
  }
  try {
    const parsed = new URL(value, 'https://pages.invalid')
    const normalized = parsed.pathname + parsed.search + parsed.hash
    // `/.//evil.com` после нормализации даёт `//evil.com`, то есть чужой хост
    return parsed.origin === 'https://pages.invalid' && !normalized.startsWith('//') ? normalized : '/'
  } catch {
    return '/'
  }
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)
}

export function createApp(config: PagesConfig, storage: PageStorage, oidc: OidcClient) {
  function sessionEmail(req: Request): string | null {
    const cookies = parseCookies(req.headers.get('cookie'))
    const session = verifySigned<{ email: string }>(cookies[SESSION_COOKIE], config.sessionSecret)
    return session && config.ownerEmails.includes(session.email) ? session.email : null
  }

  function toLogin(req: Request): Response {
    const url = new URL(req.url)
    return new Response(null, {
      status: 302,
      headers: { ...BASE_HEADERS, location: `/login?next=${encodeURIComponent(url.pathname + url.search)}` },
    })
  }

  async function handlePublish(req: Request, slug: string): Promise<Response> {
    const body = (await req.json().catch(() => null)) as {
      title?: string
      description?: string
      public?: boolean
      files?: Record<string, { text?: string; base64?: string }>
    } | null
    if (!body?.title || !body.files || typeof body.files !== 'object') {
      return json({ error: 'нужны title и files' }, 400)
    }
    const files: Record<string, Buffer> = {}
    for (const [path, file] of Object.entries(body.files)) {
      if (typeof file?.text === 'string') { files[path] = Buffer.from(file.text, 'utf8') }
      else if (typeof file?.base64 === 'string') { files[path] = Buffer.from(file.base64, 'base64') }
      else { return json({ error: `у файла ${path} нет text или base64` }, 400) }
    }
    const { version, bytes } = await storage.publish(slug, {
      title: body.title,
      description: body.description,
      public: body.public,
      files,
    })
    return json({ slug, version, bytes, url: `${config.baseUrl}/p/${slug}/` })
  }

  async function handlePage(req: Request, rest: string[]): Promise<Response> {
    const [slug, ...tail] = rest
    if (!slug) { return json({ error: 'не найдено' }, 404) }
    const meta = await storage.getMeta(slug)
    if (!meta) { return json({ error: 'не найдено' }, 404) }
    if (!meta.public && !sessionEmail(req)) { return toLogin(req) }

    // /p/<slug>/v/<N>/… — конкретная версия, иначе актуальная
    let version = meta.current
    let path = tail
    if (tail[0] === 'v' && /^\d+$/.test(tail[1] ?? '')) {
      version = Number(tail[1])
      path = tail.slice(2)
    }
    const joined = path.join('/')
    const rel = joined && new URL(req.url).pathname.endsWith('/') ? `${joined}/` : joined
    const file = await storage.resolveFile(slug, version, rel)
    if (!file) { return json({ error: 'не найдено' }, 404) }
    return new Response(Bun.file(file), {
      headers: {
        ...BASE_HEADERS,
        'content-security-policy': PAGE_CSP,
        'cache-control': meta.public ? 'public, max-age=60' : 'private, no-store',
      },
    })
  }

  async function handleIndex(req: Request): Promise<Response> {
    if (!sessionEmail(req)) { return toLogin(req) }
    const pages = await storage.list()
    const items = pages
      .map((p) =>
        `<li><a href="/p/${p.slug}/">${escapeHtml(p.title)}</a> <small>${p.slug} · v${p.current}${
          p.public ? ' · публичная' : ''
        }</small><br>${escapeHtml(p.description)}</li>`
      )
      .join('')
    const html =
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Страницы</title><style>:root{color-scheme:light dark}body{font:16px/1.6 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px}li{margin:0 0 16px;list-style:none}small{color:gray}</style><h1>Страницы</h1><ul style="padding:0">${
        items || '<li>Пока пусто.</li>'
      }</ul>`
    return new Response(html, {
      headers: { ...BASE_HEADERS, 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' },
    })
  }

  return async function handle(req: Request): Promise<Response> {
    try {
      const url = new URL(req.url)
      const parts = url.pathname.split('/').filter(Boolean)

      if (url.pathname === '/healthz') { return json({ ok: true }) }

      if (url.pathname === '/login') {
        const { url: authUrl, state } = await oidc.startLogin()
        const next = safeNext(url.searchParams.get('next'))
        const headers = new Headers({ ...BASE_HEADERS, location: authUrl })
        headers.append(
          'set-cookie',
          cookieHeader(STATE_COOKIE, createSigned({ state, next }, config.sessionSecret, STATE_TTL), STATE_TTL),
        )
        return new Response(null, { status: 302, headers })
      }

      if (url.pathname === '/auth/callback') {
        const cookies = parseCookies(req.headers.get('cookie'))
        const saved = verifySigned<{ state: string; next: string }>(cookies[STATE_COOKIE], config.sessionSecret)
        const code = url.searchParams.get('code')
        if (!saved || !code || saved.state !== url.searchParams.get('state')) {
          return json({ error: 'вход не удался: начни заново' }, 400)
        }
        const { email, verified } = await oidc.finishLogin(code)
        if (!verified || !config.ownerEmails.includes(email)) {
          return json({ error: 'этому аккаунту доступ закрыт' }, 403)
        }
        const headers = new Headers({ ...BASE_HEADERS, location: safeNext(saved.next) })
        headers.append(
          'set-cookie',
          cookieHeader(SESSION_COOKIE, createSigned({ email }, config.sessionSecret, SESSION_TTL), SESSION_TTL),
        )
        headers.append('set-cookie', clearCookieHeader(STATE_COOKIE))
        return new Response(null, { status: 302, headers })
      }

      if (parts[0] === 'api' && parts[1] === 'pages') {
        if (!bearerOk(req, config.publishToken)) { return json({ error: 'нет доступа' }, 401) }
        const slug = parts[2]
        if (!slug && req.method === 'GET') { return json({ pages: await storage.list() }) }
        if (slug && req.method === 'POST') { return await handlePublish(req, slug) }
        if (slug && req.method === 'DELETE') {
          return (await storage.remove(slug)) ? json({ removed: slug }) : json({ error: 'не найдено' }, 404)
        }
        return json({ error: 'метод не поддерживается' }, 405)
      }

      if (parts[0] === 'p' && req.method === 'GET') { return await handlePage(req, parts.slice(1)) }
      if (url.pathname === '/' && req.method === 'GET') { return await handleIndex(req) }
      return json({ error: 'не найдено' }, 404)
    } catch (error) {
      if (error instanceof PageError) { return json({ error: error.message }, error.status) }
      console.error('[pages] ошибка запроса', error)
      return json({ error: 'внутренняя ошибка' }, 500)
    }
  }
}
