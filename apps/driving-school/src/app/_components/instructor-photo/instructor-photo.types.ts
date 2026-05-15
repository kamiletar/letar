/**
 * Типы и константы для компонента загрузки фото инструктора
 *
 * @module instructor-photo.types
 */

import type { Area } from 'react-easy-crop'

/** Высота области кропа */
export const CROP_HEIGHT = 400

/** Соотношение сторон (портрет как в паспорте) */
export const ASPECT_RATIO = 3 / 4

/** Максимальный размер файла (5MB) */
export const MAX_FILE_SIZE = 5 * 1024 * 1024

/** Допустимые MIME-типы */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/** Props компонента InstructorPhotoUpload */
export interface InstructorPhotoUploadProps {
  /** Текущий URL фото */
  currentPhotoUrl: string | null
  /** Имя инструктора для alt */
  instructorName: string
  /** Callback при изменении фото */
  onPhotoChange?: (url: string | null) => void
}

/** Props для диалога кропа */
export interface PhotoCropDialogProps {
  /** Открыт ли диалог */
  open: boolean
  /** Обработчик изменения состояния */
  onOpenChange: (open: boolean) => void
  /** Выбранное изображение (data URL) */
  selectedImage: string | null
  /** Идёт загрузка */
  isUploading: boolean
  /** Обработчик сохранения */
  onSave: () => void
  /** Обработчик отмены */
  onCancel: () => void
  /** Состояние кропа */
  crop: { x: number; y: number }
  /** Обработчик изменения кропа */
  onCropChange: (crop: { x: number; y: number }) => void
  /** Масштаб */
  zoom: number
  /** Обработчик изменения масштаба */
  onZoomChange: (zoom: number) => void
  /** Callback завершения кропа */
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void
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
 * Обрезает изображение по заданной области
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
      0.95
    )
  })
}
