import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { findFolderPoster } from './poster-finder.service'

describe('findFolderPoster', () => {
  let dir: string

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'poster-finder-'))
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('папка без постера — null', async () => {
    await writeFile(path.join(dir, 'Episode 01.mkv'), '')
    expect(await findFolderPoster(dir)).toBeNull()
  })

  it('несуществующая папка — null, без исключения', async () => {
    expect(await findFolderPoster(path.join(dir, 'nope'))).toBeNull()
  })

  it('poster.jpg — находится', async () => {
    await writeFile(path.join(dir, 'poster.jpg'), '')
    expect(await findFolderPoster(dir)).toBe(path.join(dir, 'poster.jpg'))
  })

  it('cover.png — находится', async () => {
    await writeFile(path.join(dir, 'cover.png'), '')
    expect(await findFolderPoster(dir)).toBe(path.join(dir, 'cover.png'))
  })

  it('folder.webp — находится', async () => {
    await writeFile(path.join(dir, 'folder.webp'), '')
    expect(await findFolderPoster(dir)).toBe(path.join(dir, 'folder.webp'))
  })

  it('регистр имени файла не важен (Poster.JPG)', async () => {
    await writeFile(path.join(dir, 'Poster.JPG'), '')
    expect(await findFolderPoster(dir)).toBe(path.join(dir, 'Poster.JPG'))
  })

  it('приоритет — первое совпадение по порядку basename/extension, а не алфавит файлов', async () => {
    await writeFile(path.join(dir, 'cover.png'), '')
    await writeFile(path.join(dir, 'poster.jpg'), '')
    expect(await findFolderPoster(dir)).toBe(path.join(dir, 'poster.jpg'))
  })

  it('файлы серий не мешают поиску', async () => {
    await writeFile(path.join(dir, 'Episode 01.mkv'), '')
    await writeFile(path.join(dir, 'Episode 02.mkv'), '')
    await writeFile(path.join(dir, 'cover.jpeg'), '')
    expect(await findFolderPoster(dir)).toBe(path.join(dir, 'cover.jpeg'))
  })
})
