import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { createImageRepository, type ImageRepositoryDelegate } from './image-repository'

interface FakeImage {
  id: string
  filename: string
  path: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  blurDataURL: string | null
  category: string
  uploadedById: string | undefined
  uploadedAt: Date
}

/** Простейший in-memory делегат — эмулирует Prisma/ZenStack `prisma.image`. */
function makeFakeDelegate() {
  const store = new Map<string, FakeImage>()
  let nextId = 1

  const delegate: ImageRepositoryDelegate<FakeImage> = {
    async create({ data }) {
      const record: FakeImage = { id: String(nextId++), uploadedAt: new Date(0), ...data }
      store.set(record.id, record)
      return record
    },
    async update({ where, data }) {
      const record = store.get(where.id)
      if (!record) {
        throw new Error('not found')
      }
      const updated = { ...record, ...data }
      store.set(record.id, updated)
      return updated
    },
    async delete({ where }) {
      const record = where.id ? store.get(where.id) : [...store.values()].find((r) => r.path === where.path)
      if (!record) {
        throw new Error('not found')
      }
      store.delete(record.id)
      return record
    },
    async findUnique({ where }) {
      if (where.id) {
        return store.get(where.id) ?? null
      }
      return [...store.values()].find((r) => r.path === where.path) ?? null
    },
  }

  return { delegate, store }
}

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 10, g: 20, b: 30 } } }).png().toBuffer()
}

describe('createImageRepository', () => {
  it('createImageRecord без buffer оставляет width/height/blurDataURL null', async () => {
    const { delegate } = makeFakeDelegate()
    const repo = createImageRepository<FakeImage, string>(delegate)

    const image = await repo.createImageRecord({
      filename: 'a.png',
      path: 'images/a.png',
      mimeType: 'image/png',
      size: 100,
      category: 'OTHER',
    })

    expect(image.width).toBeNull()
    expect(image.height).toBeNull()
    expect(image.blurDataURL).toBeNull()
  })

  it('createImageRecord с buffer заполняет width/height/blurDataURL за один проход', async () => {
    const { delegate } = makeFakeDelegate()
    const repo = createImageRepository<FakeImage, string>(delegate)
    const buffer = await makePng(50, 40)

    const image = await repo.createImageRecord({
      filename: 'b.png',
      path: 'images/b.png',
      mimeType: 'image/png',
      size: buffer.byteLength,
      category: 'OTHER',
      buffer,
    })

    expect(image.width).toBe(50)
    expect(image.height).toBe(40)
    expect(image.blurDataURL).toMatch(/^data:image\/webp;base64,/)
  })

  it('updateImageMetadata обновляет width/height/blurDataURL по id', async () => {
    const { delegate } = makeFakeDelegate()
    const repo = createImageRepository<FakeImage, string>(delegate)
    const created = await repo.createImageRecord({
      filename: 'c.png',
      path: 'images/c.png',
      mimeType: 'image/png',
      size: 10,
      category: 'OTHER',
    })

    const buffer = await makePng(20, 20)
    const updated = await repo.updateImageMetadata(created.id, buffer)

    expect(updated.width).toBe(20)
    expect(updated.height).toBe(20)
  })

  it('getImageById/getImageByPath находят одну и ту же запись', async () => {
    const { delegate } = makeFakeDelegate()
    const repo = createImageRepository<FakeImage, string>(delegate)
    const created = await repo.createImageRecord({
      filename: 'd.png',
      path: 'images/d.png',
      mimeType: 'image/png',
      size: 10,
      category: 'OTHER',
    })

    expect(await repo.getImageById(created.id)).toEqual(created)
    expect(await repo.getImageByPath('images/d.png')).toEqual(created)
    expect(await repo.getImageById('missing')).toBeNull()
  })

  it('deleteImageRecord и deleteImageByPath удаляют запись', async () => {
    const { delegate } = makeFakeDelegate()
    const repo = createImageRepository<FakeImage, string>(delegate)

    const byId = await repo.createImageRecord({
      filename: 'e.png',
      path: 'images/e.png',
      mimeType: 'image/png',
      size: 10,
      category: 'OTHER',
    })
    await repo.deleteImageRecord(byId.id)
    expect(await repo.getImageById(byId.id)).toBeNull()

    await repo.createImageRecord({
      filename: 'f.png',
      path: 'images/f.png',
      mimeType: 'image/png',
      size: 10,
      category: 'OTHER',
    })
    await repo.deleteImageByPath('images/f.png')
    expect(await repo.getImageByPath('images/f.png')).toBeNull()
  })
})
