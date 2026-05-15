/**
 * Формирует URL для доступа к изображению по пути.
 */
export function getImageUrl(path: string): string {
  return `/api/files/${path}`
}

/**
 * Формирует URL для доступа к изображению по ID.
 */
export function getImageUrlById(id: string): string {
  return `/api/images/${id}`
}
