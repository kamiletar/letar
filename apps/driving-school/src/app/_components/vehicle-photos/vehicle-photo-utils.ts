/**
 * Утилиты для работы с фотографиями автомобилей
 *
 * Выделены из vehicle-photos-dialog.tsx для переиспользуемости
 */

import type { Area } from 'react-easy-crop'

import { VEHICLE_PHOTO_LIMITS } from '@/app/_constants'

// Реэкспорт констант для обратной совместимости
export const MAX_PHOTOS = VEHICLE_PHOTO_LIMITS.MAX_PHOTOS
export const MAX_FILE_SIZE = VEHICLE_PHOTO_LIMITS.MAX_FILE_SIZE
export const ASPECT_RATIO = VEHICLE_PHOTO_LIMITS.ASPECT_RATIO
export const CROP_HEIGHT = VEHICLE_PHOTO_LIMITS.CROP_HEIGHT

// Типы
export interface UploadedFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

/**
 * Формирует URL для получения файла через API
 */
export function getFileUrl(path: string): string {
  return `/api/files/${path}`
}

/**
 * Создаёт HTMLImageElement из URL
 */
export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })
}

/**
 * Обрезает изображение по заданной области и возвращает Blob
 */
export async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'))
          return
        }
        resolve(blob)
      },
      'image/jpeg',
      0.9
    )
  })
}

/**
 * Валидирует файл изображения
 */
export function validateImageFile(file: File): { valid: true } | { valid: false; error: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Выберите изображение' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'Размер файла не должен превышать 10MB' }
  }

  return { valid: true }
}
