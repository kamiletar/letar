/**
 * Формирует URL для доступа к изображению по пути.
 * @example getImageUrl('blog/image.png') => '/api/files/blog/image.png'
 */
export function getImageUrl(path: string): string {
  return `/api/files/${path}`
}

/**
 * Формирует URL для получения информации об изображении по ID.
 * @example getImageUrlById('abc123') => '/api/images/abc123'
 */
export function getImageUrlById(id: string): string {
  return `/api/images/${id}`
}
