/**
 * Типы для управления фотографиями автомобиля
 */

import type { File as FileModel, VehicleFile } from '@letar/driving-school-db/prisma'

/**
 * VehicleFile с включённой связью file
 */
export type VehicleFileWithFile = VehicleFile & {
  file: FileModel
}

/**
 * Статус загружаемого файла
 */
export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'

/**
 * Файл в очереди загрузки
 */
export interface UploadedFile {
  file: File
  preview: string
  status: UploadStatus
  imageId?: string
  url?: string
  error?: string
}

/**
 * Props компонента VehiclePhotos
 */
export interface VehiclePhotosProps {
  vehicleId: string
  files: VehicleFileWithFile[]
}

/**
 * Получает URL файла из пути
 */
export function getFileUrl(path: string): string {
  return `/api/files/${path}`
}
