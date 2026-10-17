import 'fake-indexeddb/auto'
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { createBlobStore, withBlobAttachments } from './offline-images'

describe('хранилище фото', () => {
  it('записывает до завершения promise и разделяет пространства приложений', async () => {
    const one = createBlobStore('images-test-one')
    const two = createBlobStore('images-test-two')
    const blob = new NodeBlob(['фото'], { type: 'image/jpeg' }) as unknown as Blob
    expect(await one.put('p', blob)).toBe(true)
    expect((await one.get('p'))?.size).toBe(blob.size)
    expect(await two.get('p')).toBeNull()
    expect(await one.keys()).toEqual(['p'])
    await one.remove('p')
    expect(await one.get('p')).toBeNull()
  })
  it('пропавшее фото не превращает отправку в успешную правку без обложки', async () => {
    await expect(withBlobAttachments({}, [{ key: 'p', blob: null }])).rejects.toThrow('не найдено')
  })
  it('исходное фото File читается так же, как уменьшенный Blob', async () => {
    const store = createBlobStore('images-test-file')
    const file = new NodeFile(['фото'], 'camera.jpg', { type: 'image/jpeg' }) as unknown as Blob
    expect(await store.put('camera', file)).toBe(true)
    expect((await store.get('camera'))?.size).toBe(file.size)
    await store.remove('camera')
  })
})
