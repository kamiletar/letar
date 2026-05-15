import { slugify } from '@letar/format-utils'

// Реэкспорт каноничной версии
export { slugify }

/**
 * Генерация SEO-friendly slug из имени товара, цвета и размера
 */
export function generateProductSlug(productName: string, color?: string, size?: string): string {
  const parts = [productName]

  if (color) {
    parts.push(color)
  }

  if (size) {
    parts.push(size)
  }

  return parts.map((part) => slugify(part)).join('-')
}
