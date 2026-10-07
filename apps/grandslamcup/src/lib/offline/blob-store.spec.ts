import 'fake-indexeddb/auto'

import { Blob as NodeBlob } from 'node:buffer'
import { afterEach, describe, expect, it } from 'vitest'

import {
  COVER_BLOB_PREFIX,
  createPendingBlobKey,
  deleteBlob,
  getBlob,
  listBlobKeys,
  PENDING_BLOB_PREFIX,
  pruneBlobs,
  putBlob,
} from './blob-store'

// Blob из Node: structuredClone у fake-indexeddb не умеет клонировать Blob из jsdom
const blob = (text: string) => new NodeBlob([text], { type: 'image/jpeg' }) as unknown as Blob

afterEach(async () => {
  for (const key of await listBlobKeys('')) {
    await deleteBlob(key)
  }
})

describe('blob-store', () => {
  it('сохраняет, читает и удаляет картинку', async () => {
    expect(await putBlob('pending:1-a', blob('фото'))).toBe(true)
    const stored = await getBlob('pending:1-a')
    expect(stored).not.toBeNull()
    expect(stored!.size).toBeGreaterThan(0)

    await deleteBlob('pending:1-a')
    expect(await getBlob('pending:1-a')).toBeNull()
  })

  it('listBlobKeys отдаёт только ключи с нужным префиксом', async () => {
    await putBlob(`${PENDING_BLOB_PREFIX}1-a`, blob('a'))
    await putBlob(`${COVER_BLOB_PREFIX}poems/x.jpg`, blob('b'))
    expect(await listBlobKeys(PENDING_BLOB_PREFIX)).toEqual([`${PENDING_BLOB_PREFIX}1-a`])
  })

  it('pruneBlobs стирает неиспользуемые фото, но не свежие и не те, что в очереди', async () => {
    const now = Date.UTC(2026, 9, 7, 13, 0, 0)
    const old = now - 2 * 60 * 60 * 1000
    await putBlob(`${PENDING_BLOB_PREFIX}${old}-used`, blob('1'))
    await putBlob(`${PENDING_BLOB_PREFIX}${old}-orphan`, blob('2'))
    await putBlob(`${PENDING_BLOB_PREFIX}${now - 1000}-fresh`, blob('3'))
    await putBlob(`${COVER_BLOB_PREFIX}poems/x.jpg`, blob('4'))

    await pruneBlobs([`${PENDING_BLOB_PREFIX}${old}-used`], now)

    expect((await listBlobKeys(PENDING_BLOB_PREFIX)).sort()).toEqual([
      `${PENDING_BLOB_PREFIX}${old}-used`,
      `${PENDING_BLOB_PREFIX}${now - 1000}-fresh`,
    ])
    // копии обложек с сайта prune не трогает
    expect(await getBlob(`${COVER_BLOB_PREFIX}poems/x.jpg`)).not.toBeNull()
  })

  it('ключи нового фото уникальны и начинаются с времени', () => {
    const a = createPendingBlobKey()
    const b = createPendingBlobKey()
    expect(a).not.toBe(b)
    expect(Number(a.slice(PENDING_BLOB_PREFIX.length).split('-')[0])).toBeGreaterThan(0)
  })
})
