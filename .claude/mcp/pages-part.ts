/**
 * Часть MCP-сервера letar: публикация страниц на свой сервис (infra/pages, pages.letar.best).
 *
 * Аналог Artifact на своём сервере: `page_publish` загружает html и файлы рядом по HTTPS с
 * токеном, без SSH и без заявки на деплой. Токен — PAGES_PUBLISH_TOKEN из окружения или
 * `.env.local` в корне репозитория (файл вне git). Адрес — PAGES_URL.
 *
 * Не воркспейс-пакет намеренно: новый пакет потребовал бы правки bun.lock, а lock-дрейф роняет
 * деплой всех приложений (.claude/rules/app-workflow.md).
 */
import { McpServer } from '@modelcontextprotocol/server'
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { z } from 'zod'

const DEFAULT_URL = 'https://pages.letar.best'

function textResult(text: string) {
  return { content: [{ type: 'text' as const, text }] }
}

function errorResult(text: string) {
  return { content: [{ type: 'text' as const, text }], isError: true }
}

/** Читает ключ из окружения, затем из `.env.local` корня репозитория. */
export function readSetting(key: string, root = process.cwd(), env: Record<string, string | undefined> = process.env) {
  if (env[key]) { return env[key] }
  const file = join(root, '.env.local')
  if (!existsSync(file)) { return undefined }
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (match?.[1] === key) { return match[2]?.replace(/^["']|["']$/g, '') }
  }
  return undefined
}

/** Заголовок из `<title>` html; пусто, если тега нет. */
export function titleFromHtml(html: string): string {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  return match?.[1]?.replace(/\s+/g, ' ').trim() ?? ''
}

const TEXT_EXT = /\.(html?|css|js|mjs|json|svg|txt|md|csv|xml)$/i
/** Что вообще можно положить на страницу; всё остальное (ключи, .env, архивы) отвергается. */
const ASSET_EXT =
  /\.(html?|css|js|mjs|json|svg|txt|md|csv|xml|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp4|webm|mp3|ogg|wav)$/i

/**
 * Собирает тело запроса публикации: основной файл становится index.html, остальные лежат рядом
 * по относительным путям (от каталога основного файла). Текстовые уходят как text, прочие как base64.
 *
 * Читает только html и файлы известных веб-типов внутри каталога страницы: путь к произвольному
 * файлу (`.env`, ключ) через assets или symlink на сервер не уйдёт.
 */
export function buildFiles(
  mainPath: string,
  assets: string[] = [],
): Record<string, { text?: string; base64?: string }> {
  if (!/\.html?$/i.test(mainPath)) { throw new Error(`основной файл должен быть html: ${mainPath}`) }
  if (lstatSync(mainPath).isSymbolicLink()) { throw new Error(`символические ссылки не публикуются: ${mainPath}`) }
  const baseDir = dirname(resolve(mainPath))
  const realBase = realpathSync(baseDir)
  const files: Record<string, { text?: string; base64?: string }> = {
    'index.html': { text: readFileSync(mainPath, 'utf8') },
  }
  for (const asset of assets) {
    const abs = resolve(baseDir, asset)
    const rel = relative(baseDir, abs).replaceAll('\\', '/')
    if (rel.startsWith('..') || rel === '' || isAbsolute(rel)) {
      throw new Error(`файл ${asset} лежит вне каталога страницы`)
    }
    if (rel.split('/').some((part) => part.startsWith('.'))) {
      throw new Error(`скрытые файлы не публикуются: ${asset}`)
    }
    if (!ASSET_EXT.test(rel)) { throw new Error(`тип файла не разрешён: ${asset}`) }
    // symlink (сам файл или каталог на пути) может вести наружу или подменять тип: отказ целиком
    if (lstatSync(abs).isSymbolicLink()) { throw new Error(`символические ссылки не публикуются: ${asset}`) }
    const real = relative(realBase, realpathSync(abs)).replaceAll('\\', '/')
    if (real.startsWith('..') || isAbsolute(real)) {
      throw new Error(`файл ${asset} ведёт за пределы каталога страницы`)
    }
    if (real.split('/').some((part) => part.startsWith('.')) || !ASSET_EXT.test(real)) {
      throw new Error(`файл ${asset} после разрешения пути не проходит проверку`)
    }
    files[rel] = TEXT_EXT.test(rel)
      ? { text: readFileSync(abs, 'utf8') }
      : { base64: readFileSync(abs).toString('base64') }
  }
  return files
}

async function call(path: string, init: RequestInit = {}) {
  const token = readSetting('PAGES_PUBLISH_TOKEN')
  if (!token) {
    throw new Error('нет PAGES_PUBLISH_TOKEN: положи его в окружение или в .env.local корня репозитория')
  }
  const base = (readSetting('PAGES_URL') ?? DEFAULT_URL).replace(/\/+$/, '')
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`${res.status} ${(body as { error?: string }).error ?? res.statusText}`)
  }
  return body as Record<string, unknown>
}

export function createPagesMcpServer(): McpServer {
  const server = new McpServer({ name: '@letar/pages', version: '0.1.0' }, { capabilities: { tools: {} } })

  server.registerTool('page_publish', {
    description:
      'Опубликовать html-страницу на pages.letar.best (приватно, вход через Ключницу). Тот же slug создаёт новую версию. '
      + 'Основной файл становится index.html, assets берутся относительно его каталога.',
    inputSchema: z.strictObject({
      slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/).describe('Адрес: латиница, цифры, дефис'),
      filePath: z.string().min(1).describe('Путь к html на диске'),
      title: z.string().optional().describe('Название; по умолчанию из <title>'),
      description: z.string().optional().describe('Одно предложение для списка'),
      public: z.boolean().optional().describe(
        'Открыть без входа. По умолчанию версия наследует прошлую, новая закрыта',
      ),
      assets: z.array(z.string()).optional().describe('Файлы рядом (css, картинки), пути относительно html'),
    }),
  }, async ({ slug, filePath, title, description, public: isPublic, assets }) => {
    try {
      const files = buildFiles(filePath, assets)
      const name = title ?? titleFromHtml(files['index.html']?.text ?? '')
      if (!name) { return errorResult('❌ page_publish: нет title и в html нет <title>') }
      const res = await call(`/api/pages/${slug}`, {
        method: 'POST',
        body: JSON.stringify({ title: name, description, public: isPublic, files }),
      })
      return textResult(
        `✅ Опубликовано: ${String(res['url'])} (версия ${String(res['version'])}, ${String(res['bytes'])} байт)`,
      )
    } catch (err) {
      return errorResult(`❌ page_publish(${slug}): ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  server.registerTool('page_list', {
    description: 'Список страниц на pages.letar.best: slug, название, версия, публичная ли.',
    inputSchema: z.strictObject({}),
  }, async () => {
    try {
      const res = await call('/api/pages')
      const pages = (res['pages'] ?? []) as Array<{ slug: string; title: string; current: number; public: boolean }>
      const lines = pages.map((p) => `${p.slug}  v${p.current}${p.public ? '  публичная' : ''}  ${p.title}`)
      return textResult(lines.length ? lines.join('\n') : 'Страниц нет.')
    } catch (err) {
      return errorResult(`❌ page_list: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  server.registerTool('page_delete', {
    description: 'Удалить страницу со всеми версиями. Необратимо: вызывать только по просьбе владельца.',
    inputSchema: z.strictObject({ slug: z.string().min(1) }),
  }, async ({ slug }) => {
    try {
      await call(`/api/pages/${slug}`, { method: 'DELETE' })
      return textResult(`✅ Удалено: ${slug}`)
    } catch (err) {
      return errorResult(`❌ page_delete(${slug}): ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  return server
}
