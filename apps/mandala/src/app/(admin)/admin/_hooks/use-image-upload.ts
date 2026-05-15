'use client'

import { useCallback, useEffect, useState } from 'react'
import { useFileDragDrop, type UseFileDragDropReturn } from './use-file-drag-drop'

/** Категория изображения для API */
export type ImageCategory = 'MANDALA' | 'THUMBNAIL' | 'WATERMARK' | 'PRODUCT' | 'OTHER'

/** Результат загрузки изображения */
export interface UploadResult {
  /** ID загруженного изображения */
  id: string
  /** URL для отображения */
  url: string
}

/** Опции хука useImageUpload */
export interface UseImageUploadOptions {
  /** Категория изображения */
  category?: ImageCategory
  /** Разрешить множественный выбор (default: false) */
  multiple?: boolean
  /** Отключено (default: false) */
  disabled?: boolean
  /** Callback при успешной загрузке */
  onSuccess?: (result: UploadResult) => void
  /** Callback при ошибке */
  onError?: (error: string) => void
}

/** Результат хука useImageUpload */
export interface UseImageUploadReturn extends UseFileDragDropReturn {
  /** Последний загруженный результат */
  lastUpload: UploadResult | null
  /** Загрузить файл программно */
  uploadFile: (file: File) => Promise<UploadResult | null>
}

/**
 * Хук для загрузки изображений через API.
 * Инкапсулирует общую логику загрузки: fetch, обработка ответа, колбэки.
 *
 * @example
 * ```tsx
 * // Одиночная загрузка
 * const upload = useImageUpload({
 *   category: 'MANDALA',
 *   onSuccess: (result) => {
 *     setImageId(result.id)
 *     setPreviewUrl(result.url)
 *   },
 * })
 *
 * // Множественная загрузка
 * const upload = useImageUpload({
 *   category: 'PRODUCT',
 *   multiple: true,
 *   onSuccess: (result) => {
 *     setImages((prev) => [...prev, result])
 *   },
 * })
 * ```
 */
export function useImageUpload(options: UseImageUploadOptions = {}): UseImageUploadReturn {
  const { category = 'OTHER', multiple = false, disabled = false, onSuccess, onError } = options

  const [lastUpload, setLastUpload] = useState<UploadResult | null>(null)

  /**
   * Загружает файл на сервер (возвращает результат).
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (!response.ok) {
          const errorMessage = result.error || 'Ошибка загрузки'
          onError?.(errorMessage)
          throw new Error(errorMessage)
        }

        const uploadResult: UploadResult = {
          id: result.id,
          url: result.url,
        }

        setLastUpload(uploadResult)
        onSuccess?.(uploadResult)

        return uploadResult
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ошибка загрузки'
        onError?.(message)
        throw error
      }
    },
    [category, onSuccess, onError]
  )

  /**
   * Обёртка для useFileDragDrop (возвращает void).
   */
  const handleUpload = useCallback(
    async (file: File): Promise<void> => {
      await uploadFile(file)
    },
    [uploadFile]
  )

  // Используем useFileDragDrop для drag-n-drop функциональности
  const dragDrop = useFileDragDrop({
    onUpload: handleUpload,
    acceptTypes: 'image/*',
    multiple,
    disabled,
  })

  return {
    ...dragDrop,
    lastUpload,
    uploadFile,
  }
}

/** Опции для загрузки превью по Image ID */
export interface UseImagePreviewOptions {
  /** Image ID или URL */
  value: string
}

/** Результат хука useImagePreview */
export interface UseImagePreviewReturn {
  /** URL для отображения */
  previewUrl: string | null
  /** Загружается ли превью */
  isLoading: boolean
}

/**
 * Хук для загрузки URL превью по Image ID.
 *
 * @example
 * ```tsx
 * const { previewUrl, isLoading } = useImagePreview({ value: imageId })
 *
 * if (isLoading) return <Spinner />
 * if (previewUrl) return <NextImage src={previewUrl} ... />
 * ```
 */
export function useImagePreview({ value }: UseImagePreviewOptions): UseImagePreviewReturn {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return
    }

    // Если value уже URL (обратная совместимость) — используем его
    if (value.startsWith('/api/files/') || value.startsWith('http')) {
      setPreviewUrl(value)
      return
    }

    // Иначе это Image ID — загружаем URL
    setIsLoading(true)
    fetch(`/api/images/${value}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.url) {
          setPreviewUrl(data.url)
        }
      })
      .catch(() => {
        // Если API не отвечает, пробуем использовать value как есть
        setPreviewUrl(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [value])

  return { previewUrl, isLoading }
}
