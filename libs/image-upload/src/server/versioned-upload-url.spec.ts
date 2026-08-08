import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getVersionedUploadUrl } from './versioned-upload-url'

describe('getVersionedUploadUrl', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'letar-versioned-upload-'))
  })

  afterEach(async () => {
    await rm(root, { force: true, recursive: true })
  })

  it('добавляет к URL короткий хэш содержимого файла', async () => {
    const bytes = Buffer.from('новая версия изображения')
    await writeFile(path.join(root, 'comic cover.webp'), bytes)

    const expectedHash = createHash('sha256').update(bytes).digest('hex').slice(0, 12)

    expect(getVersionedUploadUrl('comic cover.webp', { root })).toBe(
      `/api/files/comic%20cover.webp?v=${expectedHash}`,
    )
  })

  it('меняет URL при изменении содержимого под прежним именем', async () => {
    const filePath = path.join(root, 'webtoon.webp')
    await writeFile(filePath, 'первая версия')
    const firstUrl = getVersionedUploadUrl('webtoon.webp', { root })

    await writeFile(filePath, 'вторая версия')
    const secondUrl = getVersionedUploadUrl('webtoon.webp', { root })

    expect(secondUrl).not.toBe(firstUrl)
  })

  it('не позволяет читать файл за пределами uploads', () => {
    expect(() => getVersionedUploadUrl('../secret.webp', { root })).toThrow(/за пределы uploads/)
  })
})
