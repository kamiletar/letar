import sharp, { type ResizeOptions } from 'sharp'

export interface ProcessUploadImageResizeOptions extends Pick<ResizeOptions, 'fit' | 'withoutEnlargement'> {
  width: number
  height: number
}

export interface ProcessUploadImageBlurOptions {
  /** Сторона квадратного превью в пикселях. По умолчанию 10. */
  size?: number
  /** Сигма гауссова размытия. По умолчанию 1. */
  blur?: number
  /** Качество WebP превью (0-100). По умолчанию 20. */
  quality?: number
}

export interface ProcessUploadImageOptions {
  /** Применить EXIF-ориентацию перед остальной обработкой. По умолчанию выключено. */
  rotate?: boolean
  /** Ресайз итогового изображения. Без опции размеры не меняются. */
  resize?: ProcessUploadImageResizeOptions
  /** Формат перекодирования итогового буфера. Без опции буфер возвращается как есть. */
  format?: 'webp'
  /** Качество перекодирования (0-100), действует только вместе с `format`. По умолчанию 82. */
  quality?: number
  /**
   * Сгенерировать data-URL превью для `placeholder="blur"`.
   * `true` — со значениями по умолчанию, объект — с переопределением.
   */
  blurDataURL?: ProcessUploadImageBlurOptions | boolean
}

export interface ProcessUploadImageResult {
  data: Buffer
  width: number | null
  height: number | null
  blurDataURL: string | null
}

/**
 * Единая sharp-обработка загружаемого изображения: декодирование буфера один раз,
 * опциональная EXIF-ротация, ресайз, перекодирование в WebP и генерация blurDataURL —
 * производные операции идут через `clone()`, чтобы не декодировать буфер повторно.
 *
 * Без `resize`/`format` возвращает исходный буфер как есть (только читает метаданные) —
 * подходит для схем, которым нужны лишь width/height без изменения файла.
 */
export async function processUploadImage(
  buffer: Buffer,
  options: ProcessUploadImageOptions = {},
): Promise<ProcessUploadImageResult> {
  const { rotate = false, resize, format, quality = 82, blurDataURL } = options

  let image = sharp(buffer)
  if (rotate) {
    image = image.rotate()
  }

  const metadata = await image.metadata()
  let data = buffer
  let width = metadata.width ?? null
  let height = metadata.height ?? null

  if (resize || format) {
    let pipeline = image.clone()
    if (resize) {
      pipeline = pipeline.resize(resize)
    }
    if (format === 'webp') {
      pipeline = pipeline.webp({ quality })
    }
    const output = await pipeline.toBuffer({ resolveWithObject: true })
    data = output.data
    width = output.info.width
    height = output.info.height
  }

  let blurResult: string | null = null
  if (blurDataURL) {
    const blurOptions = typeof blurDataURL === 'object' ? blurDataURL : {}
    const size = blurOptions.size ?? 10
    const blurSigma = blurOptions.blur ?? 1
    const blurQuality = blurOptions.quality ?? 20

    const blurBuffer = await image
      .clone()
      .resize(size, size, { fit: 'inside' })
      .blur(blurSigma)
      .webp({ quality: blurQuality })
      .toBuffer()

    blurResult = `data:image/webp;base64,${blurBuffer.toString('base64')}`
  }

  return { data, width, height, blurDataURL: blurResult }
}
