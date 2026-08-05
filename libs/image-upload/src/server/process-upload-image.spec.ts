import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { processUploadImage } from './process-upload-image'

/** Генерирует PNG заданного размера — не тянем фикстуры в репозиторий. */
async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .png()
    .toBuffer()
}

describe('processUploadImage', () => {
  it('без опций возвращает исходный буфер как есть, только читает метаданные', async () => {
    const input = await makePng(40, 30)

    const result = await processUploadImage(input)

    expect(result.data).toBe(input)
    expect(result.width).toBe(40)
    expect(result.height).toBe(30)
    expect(result.blurDataURL).toBeNull()
  })

  it('ресайзит и перекодирует в webp с withoutEnlargement', async () => {
    const input = await makePng(200, 100)

    const result = await processUploadImage(input, {
      resize: { width: 50, height: 50, fit: 'inside', withoutEnlargement: true },
      format: 'webp',
      quality: 82,
    })

    expect(result.data).not.toBe(input)
    expect(result.width).toBeLessThanOrEqual(50)
    expect(result.height).toBeLessThanOrEqual(50)

    const outMeta = await sharp(result.data).metadata()
    expect(outMeta.format).toBe('webp')
  })

  it('withoutEnlargement не увеличивает изображение меньше целевого размера', async () => {
    const input = await makePng(20, 10)

    const result = await processUploadImage(input, {
      resize: { width: 200, height: 200, fit: 'inside', withoutEnlargement: true },
      format: 'webp',
    })

    expect(result.width).toBe(20)
    expect(result.height).toBe(10)
  })

  it('генерирует blurDataURL с параметрами по умолчанию', async () => {
    const input = await makePng(100, 100)

    const result = await processUploadImage(input, { blurDataURL: true })

    expect(result.blurDataURL).toMatch(/^data:image\/webp;base64,/)
    // Без resize/format — данные и размеры не меняются, генерируется только превью
    expect(result.data).toBe(input)
    expect(result.width).toBe(100)
    expect(result.height).toBe(100)
  })

  it('blurDataURL принимает переопределение size/blur/quality', async () => {
    const input = await makePng(100, 100)

    const result = await processUploadImage(input, {
      blurDataURL: { size: 4, blur: 2, quality: 10 },
    })

    expect(result.blurDataURL).toMatch(/^data:image\/webp;base64,/)
  })

  it('комбинирует resize+format с blurDataURL за один проход', async () => {
    const input = await makePng(300, 150)

    const result = await processUploadImage(input, {
      resize: { width: 60, height: 60, fit: 'inside', withoutEnlargement: true },
      format: 'webp',
      blurDataURL: true,
    })

    expect(result.width).toBeLessThanOrEqual(60)
    expect(result.blurDataURL).toMatch(/^data:image\/webp;base64,/)

    const outMeta = await sharp(result.data).metadata()
    expect(outMeta.format).toBe('webp')
  })

  it('rotate вызывает EXIF-ориентацию перед ресайзом без ошибок', async () => {
    const input = await makePng(50, 30)

    const result = await processUploadImage(input, {
      rotate: true,
      resize: { width: 20, height: 20, fit: 'inside', withoutEnlargement: true },
      format: 'webp',
    })

    expect(result.width).toBeLessThanOrEqual(20)
    expect(result.height).toBeLessThanOrEqual(20)
  })

  it('бросает исключение на повреждённом буфере', async () => {
    const garbage = Buffer.from('not an image')

    await expect(processUploadImage(garbage)).rejects.toThrow()
  })
})
