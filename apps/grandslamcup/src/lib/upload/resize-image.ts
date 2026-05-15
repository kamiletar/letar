/**
 * Серверный ресайз изображений через sharp.
 * Ресайзит до maxDimension по длинной стороне, сохраняя пропорции.
 * Для аватаров — квадратный кроп 400x400.
 */

import sharp from 'sharp'

/** Максимальный размер загрузки (15 МБ) */
export const MAX_UPLOAD_SIZE = 15 * 1024 * 1024

/** Ресайз изображения — сохраняет пропорции, уменьшает если больше maxDimension */
export async function resizeImage(buffer: Buffer, maxDimension = 1920): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata()
  const { width, height } = metadata
  if (width && height && (width > maxDimension || height > maxDimension)) {
    return sharp(buffer)
      .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
  }
  return buffer
}

/** Квадратный кроп для аватаров поэтов (400x400, center crop) */
export async function resizeAvatar(buffer: Buffer, size = 400): Promise<Buffer> {
  return sharp(buffer).resize(size, size, { fit: 'cover', position: 'centre' }).jpeg({ quality: 85 }).toBuffer()
}
