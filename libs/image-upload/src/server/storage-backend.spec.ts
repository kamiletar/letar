import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createLocalDiskBackend } from './storage-backend'

let root: string
/** Каталог рядом с корнем — цель попыток выхода наружу. */
let outside: string
/** true, если ОС дала создать симлинк (на Windows нужен режим разработчика). */
let symlinksAvailable = false

beforeAll(async () => {
  const base = await mkdtemp(path.join(tmpdir(), 'letar-storage-backend-'))
  root = path.join(base, 'uploads')
  outside = path.join(base, 'secret')

  await mkdir(root, { recursive: true })
  await mkdir(outside, { recursive: true })
  await mkdir(path.join(root, 'images'), { recursive: true })

  await writeFile(path.join(root, 'images', 'photo.png'), 'PNG-DATA')
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

describe('createLocalDiskBackend', () => {
  it('stat: возвращает размер существующего файла', async () => {
    const backend = createLocalDiskBackend(root)
    const result = await backend.stat(['images', 'photo.png'])
    expect(result).toEqual({ ok: true, size: 8 })
  })

  it('stat: not-found на несуществующем файле', async () => {
    const backend = createLocalDiskBackend(root)
    const result = await backend.stat(['images', 'missing.png'])
    expect(result).toEqual({ ok: false, reason: 'not-found' })
  })

  it('stat: not-found на каталоге, а не 500-подобная ошибка', async () => {
    const backend = createLocalDiskBackend(root)
    const result = await backend.stat(['images'])
    expect(result).toEqual({ ok: false, reason: 'not-found' })
  })

  it('stat: forbidden на симлинке, указывающем наружу', async () => {
    if (!symlinksAvailable) {
      return
    }
    const backend = createLocalDiskBackend(root)
    const result = await backend.stat(['escape.png'])
    expect(result).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('createReadStream: отдаёт содержимое файла целиком', async () => {
    const backend = createLocalDiskBackend(root)
    const chunks: Uint8Array[] = []
    for await (
      const chunk of backend.createReadStream(['images', 'photo.png']) as unknown as AsyncIterable<Uint8Array>
    ) {
      chunks.push(chunk)
    }
    expect(Buffer.concat(chunks).toString()).toBe('PNG-DATA')
  })

  it('createReadStream: уважает диапазон байт', async () => {
    const backend = createLocalDiskBackend(root)
    const chunks: Uint8Array[] = []
    const stream = backend.createReadStream(['images', 'photo.png'], { start: 0, end: 2 })
    for await (const chunk of stream as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    expect(Buffer.concat(chunks).toString()).toBe('PNG')
  })

  it('write: создаёт недостающие директории и пишет файл', async () => {
    const backend = createLocalDiskBackend(root)
    await backend.write(['new-category', 'file.png'], Buffer.from('NEW-DATA'))

    const result = await backend.stat(['new-category', 'file.png'])
    expect(result).toEqual({ ok: true, size: 8 })
  })

  it('delete: удаляет существующий файл', async () => {
    const backend = createLocalDiskBackend(root)
    await backend.write(['to-delete.png'], Buffer.from('X'))
    await backend.delete(['to-delete.png'])

    expect(await backend.stat(['to-delete.png'])).toEqual({ ok: false, reason: 'not-found' })
  })

  it('delete: не бросает на несуществующем файле', async () => {
    const backend = createLocalDiskBackend(root)
    await expect(backend.delete(['already-gone.png'])).resolves.toBeUndefined()
  })

  it('delete: не бросает и не удаляет ничего на пути вне корня', async () => {
    const backend = createLocalDiskBackend(root)
    await expect(backend.delete(['..', 'secret', 'passwords.txt'])).resolves.toBeUndefined()

    const outsideBackend = createLocalDiskBackend(outside)
    expect(await outsideBackend.stat(['passwords.txt'])).toEqual({ ok: true, size: 10 })
  })

  it('read: возвращает содержимое файла', async () => {
    const backend = createLocalDiskBackend(root)
    const bytes = await backend.read(['images', 'photo.png'])
    expect(bytes?.toString()).toBe('PNG-DATA')
  })

  it('read: null на несуществующем файле', async () => {
    const backend = createLocalDiskBackend(root)
    expect(await backend.read(['images', 'missing.png'])).toBeNull()
  })

  it('read: null на пути вне корня', async () => {
    const backend = createLocalDiskBackend(root)
    expect(await backend.read(['..', 'secret', 'passwords.txt'])).toBeNull()
  })
})
