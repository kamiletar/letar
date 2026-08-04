import { existsSync } from 'fs'
import { mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { getImageById, deleteImageRecord, deleteImageByPath } = vi.hoisted(() => ({
  getImageById: vi.fn(),
  deleteImageRecord: vi.fn(async () => undefined),
  deleteImageByPath: vi.fn(async () => undefined),
}))

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => ({ user: { id: 'admin-1', roles: ['ADMIN'] } })),
}))

vi.mock('@/lib/images', () => ({
  getImageById,
  deleteImageRecord,
  deleteImageByPath,
  createImageRecord: vi.fn(),
  getImageUrl: (path: string) => `/api/files/${path}`,
}))

const { DELETE } = await import('../route')

// vitest запускается с root = apps/kami, поэтому cwd совпадает с тем,
// который роут использует для вычисления корня uploads.
const UPLOADS_ROOT = join(process.cwd(), 'uploads')
const FIXTURE_DIR = join(UPLOADS_ROOT, '__upload_spec__')
const FIXTURE_FILE = join(FIXTURE_DIR, 'sample.png')
const ID_FIXTURE_FILE = join(FIXTURE_DIR, 'by-id.png')

/**
 * Положительный контроль: реальный файл ЗА пределами uploads/. Без него тест на
 * traversal доказывал бы только то, что файла нет, а не то, что выход запрещён.
 */
const OUTSIDE_FILE = join(process.cwd(), '__upload_spec_outside__.png')

const request = (url: string) =>
  new Request(`http://localhost:3000/api/upload?url=${url}`, { method: 'DELETE' }) as never

beforeAll(async () => {
  await mkdir(FIXTURE_DIR, { recursive: true })
  await writeFile(FIXTURE_FILE, Buffer.from('fake-png'))
  await writeFile(ID_FIXTURE_FILE, Buffer.from('fake-png'))
  await writeFile(OUTSIDE_FILE, Buffer.from('secret'))
})

afterAll(async () => {
  await rm(FIXTURE_DIR, { recursive: true, force: true })
  await rm(OUTSIDE_FILE, { force: true })
})

beforeEach(() => {
  deleteImageByPath.mockClear()
})

describe('DELETE /api/upload?url= — защита от path traversal', () => {
  it('удаляет файл по легальному пути внутри uploads/', async () => {
    const response = await DELETE(request('/api/files/__upload_spec__/sample.png') as never)
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(existsSync(FIXTURE_FILE)).toBe(false)
  })

  it('положительный контроль: файл за пределами uploads/ существует и читаем', async () => {
    expect(existsSync(OUTSIDE_FILE)).toBe(true)
  })

  it('запрещает выход из uploads/ через ../ (существующий файл снаружи)', async () => {
    const response = await DELETE(request('/api/files/../__upload_spec_outside__.png') as never)

    expect(response.status).toBe(400)
    expect(existsSync(OUTSIDE_FILE)).toBe(true)
  })

  it('запрещает глубокий выход за пределы приложения', async () => {
    const response = await DELETE(request('/api/files/../../../../package.json') as never)

    expect(response.status).toBe(400)
    expect(existsSync(join(process.cwd(), '..', '..', 'package.json'))).toBe(true)
  })

  it('запрещает traversal в процентной кодировке (%2e%2e%2f)', async () => {
    // searchParams.get раскодирует это в `../` ещё до проверки префикса —
    // именно поэтому защита не может опираться на вид исходной строки.
    const response = await DELETE(request('/api/files/%2e%2e%2f__upload_spec_outside__.png') as never)

    expect(response.status).toBe(400)
    expect(existsSync(OUTSIDE_FILE)).toBe(true)
  })

  it('удаление по id также защищено от traversal в image.path', async () => {
    getImageById.mockResolvedValueOnce({ id: 'img-1', path: '../../../../package.json' })

    const response = await DELETE(
      new Request('http://localhost:3000/api/upload?id=img-1', { method: 'DELETE' }) as never,
    )
    const json = await response.json()

    // Запись из БД всё равно удаляется (админ явно попросил), но файл на диске — нет.
    expect(json.success).toBe(true)
    expect(existsSync(join(process.cwd(), '..', '..', 'package.json'))).toBe(true)
  })

  it('удаление по id с легальным path работает как раньше', async () => {
    getImageById.mockResolvedValueOnce({ id: 'img-2', path: '__upload_spec__/by-id.png' })

    const response = await DELETE(
      new Request('http://localhost:3000/api/upload?id=img-2', { method: 'DELETE' }) as never,
    )
    const json = await response.json()

    expect(json.success).toBe(true)
    expect(existsSync(ID_FIXTURE_FILE)).toBe(false)
    expect(deleteImageRecord).toHaveBeenCalledWith('img-2')
  })
})
