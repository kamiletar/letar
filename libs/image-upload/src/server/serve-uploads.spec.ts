import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createUploadsRoute, parseRange, resolveUploadPath } from './serve-uploads'

let root: string
/** Каталог рядом с корнем — цель попыток выхода наружу. */
let outside: string
/** true, если ОС дала создать симлинк (на Windows нужен режим разработчика). */
let symlinksAvailable = false

beforeAll(async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'letar-uploads-'))
  root = path.join(base, 'uploads')
  outside = path.join(base, 'secret')

  await mkdir(root, { recursive: true })
  await mkdir(outside, { recursive: true })
  await mkdir(path.join(root, 'images'), { recursive: true })

  await writeFile(path.join(root, 'images', 'photo.png'), 'PNG-DATA')
  await writeFile(path.join(root, 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  await writeFile(path.join(root, 'track.mp3'), '0123456789')
  await writeFile(path.join(root, 'notes.xyz'), 'unknown-ext')
  // Легальное имя, начинающееся с двух точек — регрессия на наивную проверку startsWith('..').
  await writeFile(path.join(root, '..hidden.png'), 'HIDDEN')
  await writeFile(path.join(outside, 'passwords.txt'), 'TOP-SECRET')

  try {
    await symlink(path.join(outside, 'passwords.txt'), path.join(root, 'escape.png'))
    symlinksAvailable = true
  } catch {
    symlinksAvailable = false
  }
})

afterAll(async () => {
  if (root) {
    await rm(path.dirname(root), { recursive: true, force: true })
  }
})

/** Вызывает обработчик так, как это делает Next.js App Router. */
function call(handler: ReturnType<typeof createUploadsRoute>, segments: string[], init?: RequestInit) {
  const url = `http://localhost/api/files/${segments.map(encodeURIComponent).join('/')}`
  return handler(new Request(url, init), { params: Promise.resolve({ path: segments }) })
}

describe('resolveUploadPath', () => {
  it('разрешает файл внутри корня', () => {
    const result = resolveUploadPath('/srv/uploads', ['images', 'photo.png'])
    expect(result.ok).toBe(true)
    expect(result.ok && result.absPath).toBe(path.resolve('/srv/uploads/images/photo.png'))
  })

  it.each([
    [['..', 'etc', 'passwd'], 'выход на уровень вверх'],
    [['images', '..', '..', 'secret.txt'], 'выход через подкаталог'],
    [['..'], 'одиночный ..'],
    [[], 'пустой путь — это сам каталог'],
  ])('отклоняет traversal: %j (%s)', (segments) => {
    const result = resolveUploadPath('/srv/uploads', segments as string[])
    expect(result).toEqual({ ok: false, reason: 'traversal' })
  })

  it('не обманывается склейкой точек вроде `....//....//`', () => {
    // Это payload против фильтров, которые вырезают `../` подстрокой:
    // после такой «очистки» из `....//` получается `../`. Нормализация
    // ничего не вырезает — `....` для неё обычное имя каталога,
    // поэтому путь остаётся внутри корня и отвергать его не нужно.
    const result = resolveUploadPath('/srv/uploads', ['....', '....', 'etc'])

    expect(result.ok).toBe(true)
    expect(result.ok && result.absPath).toBe(path.resolve('/srv/uploads/..../..../etc'))
  })

  it('отклоняет абсолютный путь в сегменте', () => {
    const absolute = process.platform === 'win32' ? 'C:\\Windows\\win.ini' : '/etc/passwd'
    const result = resolveUploadPath('/srv/uploads', [absolute])
    expect(result).toEqual({ ok: false, reason: 'traversal' })
  })

  it('отклоняет нулевой байт как невалидный ввод, а не как traversal', () => {
    const result = resolveUploadPath('/srv/uploads', ['photo.png\0.txt'])
    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('НЕ отклоняет легальное имя файла, начинающееся с точек', () => {
    const result = resolveUploadPath('/srv/uploads', ['..hidden.png'])
    expect(result.ok).toBe(true)
  })

  it('не путает соседний каталог с префиксом корня', () => {
    // /srv/uploads-evil начинается с /srv/uploads, но лежит снаружи.
    const result = resolveUploadPath('/srv/uploads', ['..', 'uploads-evil', 'file.png'])
    expect(result).toEqual({ ok: false, reason: 'traversal' })
  })
})

describe('parseRange', () => {
  it('возвращает undefined без заголовка', () => {
    expect(parseRange(null, 100)).toBeUndefined()
  })

  it('разбирает явный диапазон', () => {
    expect(parseRange('bytes=0-4', 10)).toEqual({ start: 0, end: 4 })
  })

  it('разбирает открытый справа диапазон', () => {
    expect(parseRange('bytes=5-', 10)).toEqual({ start: 5, end: 9 })
  })

  it('разбирает суффиксную форму', () => {
    expect(parseRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 })
  })

  it('обрезает конец по размеру файла', () => {
    expect(parseRange('bytes=0-999', 10)).toEqual({ start: 0, end: 9 })
  })

  it('сообщает о невыполнимом диапазоне', () => {
    expect(parseRange('bytes=50-60', 10)).toBe('unsatisfiable')
  })

  it('игнорирует мусор вместо диапазона', () => {
    expect(parseRange('rows=1-2', 10)).toBeUndefined()
  })
})

describe('createUploadsRoute', () => {
  it('отдаёт файл с MIME-типом и кэшем', async () => {
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['images', 'photo.png'])

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect(response.headers.get('Content-Length')).toBe('8')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(await response.text()).toBe('PNG-DATA')
  })

  it('отдаёт 404 на несуществующем файле', async () => {
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['images', 'missing.png'])
    expect(response.status).toBe(404)
  })

  it('отдаёт 404 на каталоге, а не 500', async () => {
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['images'])
    expect(response.status).toBe(404)
  })

  it('отдаёт 403 на попытке выйти за пределы корня', async () => {
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['..', 'secret', 'passwords.txt'])

    expect(response.status).toBe(403)
    expect(await response.text()).not.toContain('TOP-SECRET')
  })

  it('отдаёт 400 на нулевом байте в пути', async () => {
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['photo.png\0.txt'])
    expect(response.status).toBe(400)
  })

  it('отдаёт файл с именем, начинающимся с точек', async () => {
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['..hidden.png'])

    expect(response.status).toBe(200)
    expect(await response.text()).toBe('HIDDEN')
  })

  it('блокирует симлинк, указывающий наружу', async () => {
    if (!symlinksAvailable) {
      // Windows без режима разработчика не даёт создать симлинк — проверять нечего.
      return
    }
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['escape.png'])

    expect(response.status).toBe(403)
    expect(await response.text()).not.toContain('TOP-SECRET')
  })

  it('запрещает SVG исполнять скрипты через CSP', async () => {
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['logo.svg'])

    expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
    expect(response.headers.get('Content-Security-Policy')).toContain('sandbox')
  })

  it('откатывается на octet-stream для неизвестного расширения', async () => {
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['notes.xyz'])
    expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
  })

  it('отдаёт частичный контент по заголовку Range', async () => {
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['track.mp3'], { headers: { range: 'bytes=2-5' } })

    expect(response.status).toBe(206)
    expect(response.headers.get('Content-Range')).toBe('bytes 2-5/10')
    expect(response.headers.get('Content-Length')).toBe('4')
    expect(await response.text()).toBe('2345')
  })

  it('отдаёт 416 на невыполнимом диапазоне', async () => {
    const handler = createUploadsRoute({ root })
    const response = await call(handler, ['track.mp3'], { headers: { range: 'bytes=99-100' } })

    expect(response.status).toBe(416)
    expect(response.headers.get('Content-Range')).toBe('bytes */10')
  })

  it('позволяет дополнить заголовки через хук', async () => {
    const handler = createUploadsRoute({
      root,
      headers: ({ relPath }) => ({
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(relPath)}`,
      }),
    })
    const response = await call(handler, ['images', 'photo.png'])

    expect(response.headers.get('Content-Disposition')).toBe("attachment; filename*=UTF-8''images%2Fphoto.png")
  })

  it('позволяет расширить набор MIME-типов', async () => {
    const handler = createUploadsRoute({ root, mimeTypes: { '.xyz': 'application/x-custom' } })
    const response = await call(handler, ['notes.xyz'])

    expect(response.headers.get('Content-Type')).toBe('application/x-custom')
  })
})
