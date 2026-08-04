import { mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * sharp — нативный модуль, и в этих тестах он не нужен: проверяется не кроп,
 * а то, до какого файла роут вообще доходит. Мок заодно служит детектором —
 * если защита протекла, sharp получит путь наружу.
 */
const toBuffer = vi.fn(async () => Buffer.from('cropped'))
const sharpMock = vi.fn(() => ({
  resize: () => ({ jpeg: () => ({ toBuffer }) }),
}))

vi.mock('sharp', () => ({ default: sharpMock }))

const { GET } = await import('../route')

// vitest запускается с root = apps/mandala, поэтому cwd совпадает с тем,
// который роут использует для вычисления корня uploads.
const UPLOADS_ROOT = join(process.cwd(), 'uploads')
const FIXTURE_DIR = join(UPLOADS_ROOT, '__og_image_spec__')
const FIXTURE_FILE = join(FIXTURE_DIR, 'sample.png')

/**
 * Положительный контроль: реальный файл ЗА пределами uploads/. Без него тест на
 * traversal доказывал бы только то, что файла нет, а не то, что выход запрещён.
 */
const OUTSIDE_FILE = join(process.cwd(), '__og_image_spec_outside__.png')

const request = (url: string) => new Request(`http://localhost:3004/api/og-image?url=${url}`) as never

beforeAll(async () => {
  await mkdir(FIXTURE_DIR, { recursive: true })
  await writeFile(FIXTURE_FILE, Buffer.from('fake-png'))
  await writeFile(OUTSIDE_FILE, Buffer.from('secret'))
})

afterAll(async () => {
  await rm(FIXTURE_DIR, { recursive: true, force: true })
  await rm(OUTSIDE_FILE, { force: true })
})

beforeEach(() => {
  sharpMock.mockClear()
})

describe('GET /api/og-image — защита от path traversal', () => {
  it('отдаёт картинку по легальному пути внутри uploads/', async () => {
    const response = await GET(request('/api/files/__og_image_spec__/sample.png'))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/jpeg')
    expect(sharpMock).toHaveBeenCalledWith(FIXTURE_FILE)
  })

  it('положительный контроль: файл за пределами uploads/ существует и читаем', async () => {
    // Если этот тест упал — упавшие ниже traversal-тесты ничего не доказывают.
    const { readFile } = await import('fs/promises')
    await expect(readFile(OUTSIDE_FILE)).resolves.toBeDefined()
  })

  it('запрещает выход из uploads/ через ../ (существующий файл снаружи)', async () => {
    const response = await GET(request('/api/files/../__og_image_spec_outside__.png'))

    expect(response.status).toBe(403)
    expect(sharpMock).not.toHaveBeenCalled()
  })

  it('запрещает глубокий выход за пределы приложения', async () => {
    const response = await GET(request('/api/files/../../../../package.json'))

    expect(response.status).toBe(403)
    expect(sharpMock).not.toHaveBeenCalled()
  })

  it('запрещает traversal в процентной кодировке (%2e%2e%2f)', async () => {
    // searchParams.get раскодирует это в `../` ещё до проверки префикса —
    // именно поэтому защита не может опираться на вид исходной строки.
    const response = await GET(request('/api/files/%2e%2e%2f__og_image_spec_outside__.png'))

    expect(response.status).toBe(403)
    expect(sharpMock).not.toHaveBeenCalled()
  })

  it('запрещает traversal через ветку /api/images/', async () => {
    const response = await GET(request('/api/images/../__og_image_spec_outside__.png'))

    expect(response.status).toBe(403)
    expect(sharpMock).not.toHaveBeenCalled()
  })

  it('не раскодирует повторно: %252e%252e%252f остаётся именем файла, а не ../', async () => {
    // Двойное кодирование раньше проходило второй decodeURIComponent и становилось `../`.
    const response = await GET(request('/api/files/%252e%252e%252f__og_image_spec_outside__.png'))

    expect(response.status).toBe(404)
    expect(sharpMock).not.toHaveBeenCalled()
  })

  it('отклоняет абсолютный путь в остатке', async () => {
    const response = await GET(request(encodeURIComponent('/api/files/C:\\Windows\\win.ini')))

    expect([400, 403]).toContain(response.status)
    expect(sharpMock).not.toHaveBeenCalled()
  })

  it('отклоняет нулевой байт как некорректный ввод, а не как 500', async () => {
    const response = await GET(request('/api/files/sample%00.png'))

    expect(response.status).toBe(400)
    expect(sharpMock).not.toHaveBeenCalled()
  })

  it('пустой остаток пути (сам корень uploads) не отдаётся', async () => {
    const response = await GET(request('/api/files/'))

    expect(response.status).toBe(403)
    expect(sharpMock).not.toHaveBeenCalled()
  })

  it('каталог внутри uploads/ отдаёт 404, а не 500', async () => {
    const response = await GET(request('/api/files/__og_image_spec__'))

    expect(response.status).toBe(404)
    expect(sharpMock).not.toHaveBeenCalled()
  })

  it('несуществующий файл внутри uploads/ отдаёт 404', async () => {
    const response = await GET(request('/api/files/__og_image_spec__/nope.png'))

    expect(response.status).toBe(404)
    expect(sharpMock).not.toHaveBeenCalled()
  })
})
