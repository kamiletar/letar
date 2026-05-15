/**
 * Лимиты для загрузки файлов и других ограничений
 */

// Фото транспортных средств
export const VEHICLE_PHOTO_LIMITS = {
  MAX_PHOTOS: 5,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ASPECT_RATIO: 16 / 9,
  CROP_HEIGHT: 300,
} as const

// Фото инструктора
export const INSTRUCTOR_PHOTO_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DIMENSION: 2048, // px
} as const

// Аватар пользователя
export const AVATAR_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_DIMENSION: 1024, // px
} as const

// Экспорт отдельных значений для обратной совместимости
export const MAX_PHOTOS = VEHICLE_PHOTO_LIMITS.MAX_PHOTOS
export const MAX_FILE_SIZE = VEHICLE_PHOTO_LIMITS.MAX_FILE_SIZE
