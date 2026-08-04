'use client'

import { useEffect, useRef, useState } from 'react'
import { createEndpointUrlResolver, DEFAULT_IMAGE_ENDPOINT } from './image-url'
import type { ImageUrlResolver } from './types'

/** Опции хука useImagePreviewUrl. */
export interface UseImagePreviewUrlOptions {
  /** Сохранённое значение: идентификатор изображения либо готовая ссылка */
  value: string | null | undefined
  /**
   * Как превратить значение в ссылку.
   *
   * По умолчанию — шаблон `<imageEndpoint>/<value>`. Для схемы, где эндпоинт
   * отдаёт JSON, а не байты, передайте `createMetadataUrlResolver()`.
   */
  resolveImageUrl?: ImageUrlResolver
  /**
   * Эндпоинт для резолвера по умолчанию
   * @default '/api/images'
   */
  imageEndpoint?: string
}

/** Результат хука useImagePreviewUrl. */
export interface UseImagePreviewUrlReturn {
  /** Ссылка для отображения */
  previewUrl: string | null
  /** Идёт разрешение ссылки */
  isLoading: boolean
}

/**
 * Превращает сохранённое значение в ссылку для показа.
 *
 * Синхронный резолвер применяется сразу, без мигания спиннером;
 * асинхронный — с `isLoading`. Ответ устаревшего запроса отбрасывается.
 *
 * ⚠️ Резолвер читается через ref, а эффект зависит только от `value`.
 * Так inline-стрелка в пропсах не вызывает бесконечный цикл запросов.
 * Обратная сторона: смена самого резолвера без смены `value` не
 * перезапрашивает ссылку — передавайте резолвер стабильным (`useMemo`
 * или модульная константа), если он зависит от изменяемых данных.
 *
 * @example
 * ```tsx
 * const { previewUrl, isLoading } = useImagePreviewUrl({
 *   value: imageId,
 *   resolveImageUrl: createMetadataUrlResolver(),
 * })
 * ```
 */
export function useImagePreviewUrl(options: UseImagePreviewUrlOptions): UseImagePreviewUrlReturn {
  const { value, resolveImageUrl, imageEndpoint = DEFAULT_IMAGE_ENDPOINT } = options

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const resolverRef = useRef<ImageUrlResolver>(createEndpointUrlResolver(imageEndpoint))
  resolverRef.current = resolveImageUrl ?? createEndpointUrlResolver(imageEndpoint)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      setIsLoading(false)
      return
    }

    const resolved = resolverRef.current(value)

    // Синхронный резолвер — ставим ссылку сразу, без состояния загрузки
    if (!(resolved instanceof Promise)) {
      setPreviewUrl(resolved)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    resolved
      .then((url) => {
        if (!cancelled) {
          setPreviewUrl(url)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [value])

  return { previewUrl, isLoading }
}
