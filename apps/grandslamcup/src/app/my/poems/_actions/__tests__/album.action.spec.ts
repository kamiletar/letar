import { mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { moveAlbumCover } from '../album.action'

// vitest запускается с root = apps/grandslamcup, поэтому cwd совпадает с тем,
// который moveAlbumCover использует для вычисления корня uploads.
const UPLOADS_ROOT = join(process.cwd(), 'uploads')
const TEMP_DIR = join(UPLOADS_ROOT, 'albums', 'temp')
const TEMP_FILE = join(TEMP_DIR, 'cover.png')

/**
 * Положительный контроль: реальный файл ЗА пределами uploads/. Без него тест на
 * traversal доказывал бы только то, что файла нет, а не то, что выход запрещён.
 */
const OUTSIDE_FILE = join(process.cwd(), '__album_cover_spec_outside__.png')

const ALBUM_ID = '__album_cover_spec_album__'
const DEST_DIR = join(UPLOADS_ROOT, 'albums', ALBUM_ID)

beforeAll(async () => {
  await mkdir(TEMP_DIR, { recursive: true })
  await writeFile(TEMP_FILE, Buffer.from('fake-cover'))
  await writeFile(OUTSIDE_FILE, Buffer.from('secret'))
})

afterAll(async () => {
  await rm(TEMP_DIR, { recursive: true, force: true })
  await rm(DEST_DIR, { recursive: true, force: true })
  await rm(OUTSIDE_FILE, { force: true })
})

describe('moveAlbumCover — защита от path traversal', () => {
  it('перемещает легальный файл из albums/temp/ в albums/<albumId>/', async () => {
    const destPath = await moveAlbumCover('albums/temp/cover.png', ALBUM_ID)

    expect(destPath).toBe(`albums/${ALBUM_ID}/cover.png`)
  })

  it('положительный контроль: файл за пределами uploads/ существует и читаем', async () => {
    const { readFile } = await import('fs/promises')
    await expect(readFile(OUTSIDE_FILE)).resolves.toBeDefined()
  })

  it('запрещает выход из uploads/ через ../ в tempPath', async () => {
    // albums/temp — два сегмента, поэтому нужно три ../, чтобы уйти выше uploads/:
    // два откатывают temp и albums, третий выходит за сам корень.
    await expect(
      moveAlbumCover('albums/temp/../../../__album_cover_spec_outside__.png', ALBUM_ID),
    ).rejects.toThrow('Некорректный путь временной обложки')
  })

  it('запрещает глубокий выход за пределы приложения', async () => {
    await expect(
      moveAlbumCover('albums/temp/../../../../../../../etc/passwd', ALBUM_ID),
    ).rejects.toThrow('Некорректный путь временной обложки')
  })

  it('запрещает абсолютный путь (диск Windows) в tempPath', async () => {
    // '/etc/passwd' после split('/') теряет ведущий слэш и превращается в
    // относительный сегмент — реальная атака абсолютным путём на Windows
    // выглядит как путь с буквой диска, split('/') его не трогает.
    await expect(moveAlbumCover('C:\\Windows\\win.ini', ALBUM_ID)).rejects.toThrow(
      'Некорректный путь временной обложки',
    )
  })
})
