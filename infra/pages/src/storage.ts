import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, sep } from 'node:path'

/** Метаданные страницы (`<slug>/meta.json`). */
export interface PageMeta {
  title: string
  description: string
  /** Открыта без входа */
  public: boolean
  /** Номер актуальной версии */
  current: number
  versions: Array<{ n: number; at: string; bytes: number; files: number }>
}

export interface PublishInput {
  title: string
  description?: string
  public?: boolean
  /** путь внутри версии → содержимое */
  files: Record<string, Buffer>
}

export class PageError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,62}$/
const MAX_PATH = 200

export function assertSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new PageError('slug: латиница в нижнем регистре, цифры и дефис, до 63 знаков', 400)
  }
}

/** Проверяет путь файла внутри версии: относительный, без `..`, без скрытых частей и обратных слэшей. */
export function normalizeFilePath(path: string): string {
  const bad = !path || path.length > MAX_PATH || path.includes('\\') || path.includes('\0') || path.startsWith('/')
  const parts = path.split('/')
  if (bad || parts.some((p) => p === '' || p === '.' || p === '..' || p.startsWith('.'))) {
    throw new PageError(`недопустимый путь файла: ${path.slice(0, 60)}`, 400)
  }
  return parts.join('/')
}

/** Записи одного slug идут по очереди: сервис работает одним процессом. */
const locks = new Map<string, Promise<unknown>>()
function withLock<T>(slug: string, job: () => Promise<T>): Promise<T> {
  const prev = locks.get(slug) ?? Promise.resolve()
  const next = prev.catch(() => undefined).then(job)
  locks.set(slug, next)
  return next.finally(() => {
    if (locks.get(slug) === next) { locks.delete(slug) }
  })
}

async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`
  await writeFile(tmp, JSON.stringify(value, null, 2))
  await rename(tmp, path)
}

export class PageStorage {
  constructor(
    private readonly root: string,
    private readonly limits: { maxVersionBytes: number; maxFiles: number },
  ) {}

  private slugDir(slug: string): string {
    assertSlug(slug)
    return join(this.root, slug)
  }

  async getMeta(slug: string): Promise<PageMeta | null> {
    const file = join(this.slugDir(slug), 'meta.json')
    if (!existsSync(file)) { return null }
    return JSON.parse(await readFile(file, 'utf8')) as PageMeta
  }

  async list(): Promise<Array<{ slug: string } & PageMeta>> {
    if (!existsSync(this.root)) { return [] }
    const out: Array<{ slug: string } & PageMeta> = []
    for (const name of await readdir(this.root)) {
      if (!SLUG_RE.test(name)) { continue }
      const meta = await this.getMeta(name)
      if (meta) { out.push({ slug: name, ...meta }) }
    }
    return out.sort((a, b) => a.slug.localeCompare(b.slug))
  }

  publish(slug: string, input: PublishInput): Promise<{ version: number; bytes: number }> {
    const dir = this.slugDir(slug)
    const entries = Object.entries(input.files).map(([p, buf]) => [normalizeFilePath(p), buf] as const)
    if (!entries.some(([p]) => p === 'index.html')) {
      throw new PageError('в версии нет index.html', 400)
    }
    if (entries.length > this.limits.maxFiles) {
      throw new PageError(`слишком много файлов: больше ${this.limits.maxFiles}`, 413)
    }
    const bytes = entries.reduce((sum, [, buf]) => sum + buf.length, 0)
    if (bytes > this.limits.maxVersionBytes) {
      throw new PageError(`версия больше ${this.limits.maxVersionBytes} байт`, 413)
    }
    if (!input.title.trim()) {
      throw new PageError('нужен title', 400)
    }
    return withLock(slug, async () => {
      await mkdir(dir, { recursive: true })
      const prev = await this.getMeta(slug)
      const n = (prev?.versions.at(-1)?.n ?? 0) + 1
      const tmp = join(dir, `.tmp-v${n}-${Date.now()}`)
      try {
        for (const [path, buf] of entries) {
          const target = join(tmp, path)
          await mkdir(dirname(target), { recursive: true })
          await writeFile(target, buf)
        }
        await rename(tmp, join(dir, `v${n}`))
      } catch (error) {
        await rm(tmp, { recursive: true, force: true })
        throw error
      }
      const meta: PageMeta = {
        title: input.title.trim(),
        description: input.description?.trim() ?? '',
        public: input.public ?? prev?.public ?? false,
        current: n,
        versions: [...(prev?.versions ?? []), { n, at: new Date().toISOString(), bytes, files: entries.length }],
      }
      await writeJsonAtomic(join(dir, 'meta.json'), meta)
      return { version: n, bytes }
    })
  }

  async remove(slug: string): Promise<boolean> {
    const dir = this.slugDir(slug)
    return withLock(slug, async () => {
      if (!existsSync(dir)) { return false }
      await rm(dir, { recursive: true, force: true })
      return true
    })
  }

  /** Абсолютный путь файла версии или null. Выйти за каталог версии нельзя. */
  async resolveFile(slug: string, version: number, rawPath: string): Promise<string | null> {
    const base = resolve(join(this.slugDir(slug), `v${version}`))
    const wanted = rawPath === '' || rawPath.endsWith('/') ? `${rawPath}index.html` : rawPath
    let target: string
    try {
      target = resolve(join(base, normalizeFilePath(wanted)))
    } catch {
      return null
    }
    if (!target.startsWith(base + sep)) { return null }
    try {
      return (await stat(target)).isFile() ? target : null
    } catch {
      return null
    }
  }
}
