import type { File as FileModel, LocationFile } from '@letar/driving-school-db/prisma'

/**
 * LocationFile с включённой связью file.
 */
export type LocationFileWithFile = LocationFile & {
  file: FileModel
}

/**
 * Файл в очереди загрузки.
 */
export interface UploadedFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  imageId?: string
  url?: string
  error?: string
}

/**
 * Пропсы для компонента LocationImages.
 */
export interface LocationImagesProps {
  locationId: string
  files: LocationFileWithFile[]
}
