/**
 * Custom Image Loader для Next.js
 *
 * Конвертирует локальные пути в URL для API route /api/image
 * Поддерживает media://, file:// и абсолютные пути
 */

interface ImageLoaderProps {
  src: string
  width: number
  quality?: number
}

export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Если это уже HTTP URL — возвращаем как есть
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src
  }

  // Конвертируем media:// или file:// в путь
  let path = src
  if (path.startsWith('media://')) {
    path = path.slice(8) // Убираем 'media://'
  } else if (path.startsWith('file:///')) {
    path = path.slice(8) // Убираем 'file:///'
  } else if (path.startsWith('file://')) {
    path = path.slice(7) // Убираем 'file://'
  }

  // Кодируем путь для URL
  const encodedPath = encodeURIComponent(path)

  // Формируем URL с параметрами
  const params = new URLSearchParams({
    path: encodedPath,
    w: width.toString(),
  })

  if (quality) {
    params.set('q', quality.toString())
  }

  return `/api/image?${params.toString()}`
}

/**
 * Хелпер для получения src для Next Image из локального пути
 */
export function getImageSrc(path: string | null | undefined): string {
  if (!path) {
    return ''
  }

  // Убираем протоколы
  if (path.startsWith('media://')) {
    return path.slice(8)
  }
  if (path.startsWith('file:///')) {
    return path.slice(8)
  }
  if (path.startsWith('file://')) {
    return path.slice(7)
  }

  return path
}
