/**
 * Хелпер для получения URL изображения из пути.
 */
export function getImageUrl(path: string): string {
  return `/api/files/${path}`
}

/**
 * Тип изображения с URL (для компонентов отображения).
 */
export interface ImageWithUrl {
  id: string
  url: string
  alt: string | null
  order?: number
}

/**
 * Преобразует изображение с path в формат с url.
 */
export function toImageWithUrl(image: { id: string; path: string; alt?: string | null; order?: number }): ImageWithUrl {
  return {
    id: image.id,
    url: getImageUrl(image.path),
    alt: image.alt ?? null,
    order: image.order,
  }
}
