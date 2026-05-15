/**
 * Общие типы для работы с автомобилями
 *
 * @example
 * ```ts
 * import type { VehicleFileData, VehicleBase } from '@/app/_types/vehicle'
 * ```
 */

import type { TransmissionType } from '@letar/driving-school-db/prisma'

/**
 * Файл автомобиля с информацией о связанном File
 */
export interface VehicleFileData {
  id: string
  order: number
  alt: string | null
  file: {
    id: string
    path: string
    filename: string
    mimeType: string
  }
}

/**
 * Базовые поля автомобиля (общие для всех контекстов)
 */
export interface VehicleBase {
  id: string
  brand: string
  model: string
  year: number | null
  color: string | null
  plateNumber: string | null
  transmission: TransmissionType
  isPrimary: boolean
  isActive: boolean
}

/**
 * Получить URL первого фото автомобиля
 */
export function getVehiclePhotoUrl(files?: VehicleFileData[]): string | null {
  const firstFile = files?.[0]
  if (!firstFile) {
    return null
  }
  return `/api/files/${firstFile.file.path}`
}
