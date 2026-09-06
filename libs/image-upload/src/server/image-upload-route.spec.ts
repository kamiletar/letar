// @vitest-environment node
// jsdom не тянет `request.formData()` с реальным File внутри — зависает без ошибки.
// Тесту нужен только Node fetch API (Request/FormData/File), DOM ему не требуется.
import { describe, expect, it } from 'vitest'

import {
  createImageUploadRoute,
  type ImageUploadRouteImage,
  type ImageUploadRouteRepository,
} from './image-upload-route'
import type { StorageBackend } from './storage-backend'

interface FakeImage extends ImageUploadRouteImage {
  category: string
}

/** In-memory backend — доказывает, что маршрут пишет/удаляет через backend, а не напрямую в fs. */
function makeFakeBackend(): StorageBackend & { store: Map<string, Buffer> } {
  const store = new Map<string, Buffer>()
  const key = (segments: string[]) => segments.join('/')

  return {
    store,
    async stat(segments) {
      const data = store.get(key(segments))
      return data ? { ok: true, size: data.byteLength } : { ok: false, reason: 'not-found' }
    },
    createReadStream() {
      throw new Error('не используется в этих тестах')
    },
    async write(segments, data) {
      store.set(key(segments), data)
    },
    async delete(segments) {
      store.delete(key(segments))
    },
    async read(segments) {
      return store.get(key(segments)) ?? null
    },
  }
}

function makeFakeRepository() {
  const byId = new Map<string, FakeImage>()
  let nextId = 1

  const repository: ImageUploadRouteRepository<FakeImage, string> = {
    async createImageRecord(params) {
      const image: FakeImage = {
        id: String(nextId++),
        path: params.path,
        width: null,
        height: null,
        category: params.category,
      }
      byId.set(image.id, image)
      return image
    },
    async deleteImageRecord(id) {
      byId.delete(id)
    },
    async deleteImageByPath(imagePath) {
      const found = [...byId.values()].find((i) => i.path === imagePath)
      if (found) {
        byId.delete(found.id)
      }
    },
    async getImageById(id) {
      return byId.get(id) ?? null
    },
  }

  return { repository, byId }
}

describe('createImageUploadRoute', () => {
  it('POST пишет файл через backend, не на реальный диск', async () => {
    const backend = makeFakeBackend()
    const { repository } = makeFakeRepository()
    const { POST } = createImageUploadRoute({
      getSession: async () => ({ user: { id: 'u1' } }),
      isAuthorized: () => true,
      defaultCategory: 'OTHER',
      repository,
      getImageUrl: (relPath) => `/api/files/${relPath}`,
      backend,
    })

    const formData = new FormData()
    formData.append('file', new File(['DATA'], 'photo.png', { type: 'image/png' }))

    const response = await POST(new Request('http://localhost/api/upload', { method: 'POST', body: formData }))
    const body = (await response.json()) as { success: boolean; url: string }

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(backend.store.size).toBe(1)
    expect([...backend.store.values()][0]?.toString()).toBe('DATA')
  })

  it('DELETE по id удаляет файл через backend и запись из репозитория', async () => {
    const backend = makeFakeBackend()
    const { repository, byId } = makeFakeRepository()
    const image = await repository.createImageRecord({
      filename: 'a.png',
      path: 'other/a.png',
      mimeType: 'image/png',
      size: 4,
      category: 'OTHER',
    })
    await backend.write(['other', 'a.png'], Buffer.from('DATA'))

    const { DELETE } = createImageUploadRoute({
      getSession: async () => ({ user: { id: 'u1' } }),
      isAuthorized: () => true,
      defaultCategory: 'OTHER',
      repository,
      getImageUrl: (relPath) => `/api/files/${relPath}`,
      backend,
    })

    const response = await DELETE(new Request(`http://localhost/api/upload?id=${image.id}`, { method: 'DELETE' }))

    expect(response.status).toBe(200)
    expect(backend.store.size).toBe(0)
    expect(byId.has(image.id)).toBe(false)
  })
})
