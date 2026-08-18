import { createReadStream } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'

/**
 * MIME-типы по расширению (с точкой, в нижнем регистре).
 * Объединение наборов, которые были разбросаны по семи приложениям.
 */
export const DEFAULT_MIME_TYPES: Readonly<Record<string, string>> = Object.freeze({
  // Изображения
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  // Аудио
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
})

/** Кэш на год: имена файлов содержат cuid/хэш, поэтому меняются при обновлении. */
export const DEFAULT_CACHE_CONTROL = 'public, max-age=31536000, immutable'

const FALLBACK_MIME = 'application/octet-stream'

const RANGE_PATTERN = /^bytes=(\d*)-(\d*)$/

/**
 * Причина отказа при разборе пути. Нужна, чтобы вызывающий код мог
 * различить «вышли за пределы корня» и «мусор во входных данных».
 */
export type ResolveFailure = 'traversal' | 'invalid'

export type ResolveResult = { ok: true; absPath: string } | { ok: false; reason: ResolveFailure }

/**
 * Приводит сегменты URL к абсолютному пути внутри `root` и проверяет,
 * что результат действительно лежит внутри корня.
 *
 * Защита строится на нормализации пути, а не на проверке отдельных сегментов
 * на `..`: нормализация не зависит от того, как именно фреймворк разобрал URL,
 * и одинаково ловит `..`, абсолютные пути и смену диска на Windows.
 *
 * Возвращает результат-объект вместо броска исключения, чтобы функция
 * оставалась чистой и тестировалась без файловой системы.
 */
export function resolveUploadPath(root: string, segments: readonly string[]): ResolveResult {
  // Нулевой байт роняет любой вызов fs с ERR_INVALID_ARG_VALUE — отсекаем заранее,
  // иначе получим 500 вместо честного 400.
  if (segments.some((segment) => segment.includes('\0'))) {
    return { ok: false, reason: 'invalid' }
  }

  // Обратный слеш и буква диска (`C:\Windows\win.ini`) — Windows-абсолютный путь только
  // для path.win32; на проде (Linux, path.posix) `path.resolve` ниже не распознаёт его как
  // абсолютный и просто конкатенирует как один сегмент — traversal-проверка через
  // path.relative() его не ловит. Отсекаем сами, не полагаясь на ОС рантайма.
  if (segments.some((segment) => segment.includes('\\'))) {
    return { ok: false, reason: 'traversal' }
  }

  const rootAbs = path.resolve(root)
  // path.resolve, а не join: если сегмент окажется абсолютным путём
  // (`/etc/passwd`, `C:\Windows`), resolve прыгнет туда — и проверка ниже это поймает.
  const target = path.resolve(rootAbs, ...segments)
  const rel = path.relative(rootAbs, target)

  // Пустая строка — это сам корень (каталог, не файл).
  if (rel === '') {
    return { ok: false, reason: 'traversal' }
  }

  // Сравниваем именно с `..` и `..<sep>`, а не через rel.startsWith('..'):
  // иначе легальный файл с именем `..hidden.png` был бы отвергнут.
  if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
    return { ok: false, reason: 'traversal' }
  }

  return { ok: true, absPath: target }
}

/** Контекст, передаваемый в хук `headers`. */
export interface UploadFileContext {
  /** Сегменты пути из URL, как их отдал Next.js. */
  segments: string[]
  /** Путь относительно корня, через `/` — удобно как ключ в БД. */
  relPath: string
  /** Абсолютный путь к файлу на диске. */
  absPath: string
  /** Определённый MIME-тип. */
  mime: string
  /** Размер файла в байтах. */
  size: number
}

export interface CreateUploadsRouteOptions {
  /**
   * Корень раздачи. По умолчанию `<process.cwd()>/uploads`.
   * Может быть симлинком (типовой случай — том Docker): корень разыменовывается
   * отдельно, поэтому такой симлинк не считается попыткой выхода наружу.
   */
  root?: string
  /** Дополнительные или переопределяющие MIME-типы. Ключ — расширение с точкой. */
  mimeTypes?: Record<string, string>
  /** Значение заголовка `Cache-Control`. */
  cacheControl?: string
  /**
   * Хук для дополнительных заголовков конкретного файла.
   * Типовой случай — `Content-Disposition` с оригинальным именем из БД.
   */
  headers?: (ctx: UploadFileContext) => Promise<Record<string, string> | undefined> | Record<string, string> | undefined
}

type RouteContext = { params: Promise<{ path: string[] }> }

/**
 * Собирает `GET`-обработчик Next.js App Router для раздачи файлов из `uploads/`.
 *
 * Зачем вообще роут, а не `public/`: Next.js копирует `public/` в `.next/static`
 * на этапе билда, поэтому файлы, загруженные после сборки, оттуда недоступны.
 *
 * ```ts
 * // src/app/api/files/[...path]/route.ts
 * export const GET = createUploadsRoute()
 * ```
 */
export function createUploadsRoute(options: CreateUploadsRouteOptions = {}) {
  const {
    root = path.join(process.cwd(), 'uploads'),
    mimeTypes,
    cacheControl = DEFAULT_CACHE_CONTROL,
    headers: headersHook,
  } = options

  const mimeMap: Record<string, string> = mimeTypes
    ? { ...DEFAULT_MIME_TYPES, ...mimeTypes }
    : { ...DEFAULT_MIME_TYPES }

  // Разыменованный корень вычисляем один раз и переиспользуем: он нужен на
  // каждом запросе для проверки симлинков, а меняться в рантайме не может.
  let realRootPromise: Promise<string | null> | undefined

  const getRealRoot = () => {
    realRootPromise ??= realpath(path.resolve(/* turbopackIgnore: true */ root)).catch(() => null)
    return realRootPromise
  }

  return async function GET(request: Request, context: RouteContext): Promise<Response> {
    try {
      const { path: segments } = await context.params

      const resolved = resolveUploadPath(root, segments ?? [])
      if (!resolved.ok) {
        return new Response(resolved.reason === 'traversal' ? 'Forbidden' : 'Bad request', {
          status: resolved.reason === 'traversal' ? 403 : 400,
        })
      }

      let fileStat
      try {
        fileStat = await stat(/* turbopackIgnore: true */ resolved.absPath)
      } catch {
        return new Response('Not found', { status: 404 })
      }

      // Каталог — это не «ошибка сервера», а именно отсутствие файла.
      if (!fileStat.isFile()) {
        return new Response('Not found', { status: 404 })
      }

      // Симлинк внутри uploads/ может указывать наружу — нормализация пути
      // этого не видит, поэтому сверяем ещё и реальные пути.
      const realRoot = await getRealRoot()
      if (realRoot) {
        const realFile = await realpath(/* turbopackIgnore: true */ resolved.absPath).catch(() => null)
        if (!realFile) {
          return new Response('Not found', { status: 404 })
        }

        const realRel = path.relative(realRoot, realFile)
        if (realRel === '' || realRel === '..' || realRel.startsWith(`..${path.sep}`) || path.isAbsolute(realRel)) {
          return new Response('Forbidden', { status: 403 })
        }
      }

      const ext = path.extname(resolved.absPath).toLowerCase()
      const mime = mimeMap[ext] ?? FALLBACK_MIME
      const size = fileStat.size

      const responseHeaders = new Headers({
        'Content-Type': mime,
        'Cache-Control': cacheControl,
        'Accept-Ranges': 'bytes',
        // Файлы загружают пользователи — не даём браузеру угадывать тип
        // вопреки заявленному Content-Type.
        'X-Content-Type-Options': 'nosniff',
      })

      // Загруженный SVG — исполняемый документ: внутри может быть <script>,
      // который выполнится в origin приложения. Запрещаем ему всё.
      if (mime === 'image/svg+xml') {
        responseHeaders.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
      }

      if (headersHook) {
        const extra = await headersHook({
          segments,
          relPath: segments.join('/'),
          absPath: resolved.absPath,
          mime,
          size,
        })
        if (extra) {
          for (const [key, value] of Object.entries(extra)) {
            responseHeaders.set(key, value)
          }
        }
      }

      const range = parseRange(request.headers.get('range'), size)

      if (range === 'unsatisfiable') {
        responseHeaders.set('Content-Range', `bytes */${size}`)
        return new Response(null, { status: 416, headers: responseHeaders })
      }

      if (range) {
        const chunkSize = range.end - range.start + 1
        responseHeaders.set('Content-Length', String(chunkSize))
        responseHeaders.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`)

        return new Response(toWebStream(resolved.absPath, range), {
          status: 206,
          headers: responseHeaders,
        })
      }

      responseHeaders.set('Content-Length', String(size))

      // На HEAD тело не нужно, но заголовки должны совпадать с GET.
      if (request.method === 'HEAD') {
        return new Response(null, { headers: responseHeaders })
      }

      return new Response(toWebStream(resolved.absPath), { headers: responseHeaders })
    } catch (error) {
      console.error('[uploads] Ошибка раздачи файла:', error)
      return new Response('Internal server error', { status: 500 })
    }
  }
}

/** Разобранный диапазон байт или маркер «диапазон невыполним». */
type ParsedRange = { start: number; end: number } | 'unsatisfiable' | undefined

/**
 * Разбирает заголовок `Range`. Поддерживается один диапазон —
 * этого достаточно для перемотки аудио/видео в плеере.
 */
export function parseRange(header: string | null, size: number): ParsedRange {
  if (!header) {
    return undefined
  }

  const match = header.trim().match(RANGE_PATTERN)
  if (!match) {
    return undefined
  }

  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') {
    return undefined
  }

  let start: number
  let end: number

  if (rawStart === '') {
    // Суффиксная форма `bytes=-N` — последние N байт.
    const suffix = Number(rawEnd)
    if (suffix <= 0) {
      return 'unsatisfiable'
    }
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1)
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
    return 'unsatisfiable'
  }

  return { start, end }
}

function toWebStream(absPath: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  const stream = range ? createReadStream(absPath, { start: range.start, end: range.end }) : createReadStream(absPath)
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>
}
