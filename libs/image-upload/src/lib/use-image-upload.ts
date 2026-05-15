'use client'

import { useCallback, useState } from 'react'

export type ImageCategory = 'PRODUCT' | 'MANDALA' | 'THUMBNAIL' | 'WATERMARK' | 'AVATAR' | 'OTHER'

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error'

export interface UploadedImage {
  /** ID изображения в БД */
  id: string
  /** URL для отображения (через API) */
  url: string
  /** Имя файла */
  filename?: string
}

export interface UploadingFile {
  /** Локальный ID для отслеживания */
  localId: string
  /** Файл */
  file: File
  /** URL для локального превью (blob) */
  previewUrl: string
  /** Статус загрузки */
  status: UploadStatus
  /** ID изображения после успешной загрузки */
  imageId?: string
  /** Ошибка */
  error?: string
}

export interface UseImageUploadOptions {
  /**
   * Endpoint для загрузки
   * @default '/api/upload'
   */
  uploadEndpoint?: string
  /**
   * Категория изображения
   * @default 'OTHER'
   */
  category?: ImageCategory
  /**
   * Максимальный размер файла в байтах
   * @default 32MB
   */
  maxSize?: number
  /**
   * Допустимые MIME типы
   * @default ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
   */
  acceptedTypes?: string[]
  /**
   * Callback при успешной загрузке
   */
  onUploadSuccess?: (image: UploadedImage) => void
  /**
   * Callback при ошибке
   */
  onUploadError?: (error: string, file: File) => void
}

const DEFAULT_MAX_SIZE = 32 * 1024 * 1024 // 32MB
const DEFAULT_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Хук для загрузки изображений
 *
 * @example
 * ```tsx
 * const { upload, isUploading } = useImageUpload({
 *   category: 'PRODUCT',
 *   onUploadSuccess: (image) => console.log('Uploaded:', image.id),
 * })
 *
 * const handleDrop = (files: FileList) => {
 *   Array.from(files).forEach(file => upload(file))
 * }
 * ```
 */
export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    uploadEndpoint = '/api/upload',
    category = 'OTHER',
    maxSize = DEFAULT_MAX_SIZE,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    onUploadSuccess,
    onUploadError,
  } = options

  const [files, setFiles] = useState<UploadingFile[]>([])
  const [isUploading, setIsUploading] = useState(false)

  /**
   * Валидация файла перед загрузкой
   */
  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / 1024 / 1024)
        return `Файл слишком большой (макс. ${maxMB}MB)`
      }

      if (!acceptedTypes.includes(file.type)) {
        return 'Неподдерживаемый формат файла'
      }

      return null
    },
    [maxSize, acceptedTypes]
  )

  /**
   * Загрузить один файл
   */
  const uploadFile = useCallback(
    async (file: File): Promise<UploadedImage | null> => {
      const error = validateFile(file)
      if (error) {
        onUploadError?.(error, file)
        return null
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('category', category)

      try {
        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Ошибка загрузки: ${response.status}`)
        }

        const data = await response.json()
        const uploadedImage: UploadedImage = {
          id: data.id || data.imageId,
          url: data.url || `/api/images/${data.id || data.imageId}`,
          filename: file.name,
        }

        onUploadSuccess?.(uploadedImage)
        return uploadedImage
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки'
        onUploadError?.(errorMessage, file)
        return null
      }
    },
    [uploadEndpoint, category, validateFile, onUploadSuccess, onUploadError]
  )

  /**
   * Добавить файл в очередь и начать загрузку
   */
  const upload = useCallback(
    async (file: File): Promise<UploadedImage | null> => {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const previewUrl = URL.createObjectURL(file)

      // Добавляем в список
      const uploadingFile: UploadingFile = {
        localId,
        file,
        previewUrl,
        status: 'uploading',
      }

      setFiles((prev) => [...prev, uploadingFile])
      setIsUploading(true)

      try {
        const result = await uploadFile(file)

        setFiles((prev) =>
          prev.map((f) =>
            f.localId === localId
              ? {
                  ...f,
                  status: result ? 'success' : 'error',
                  imageId: result?.id,
                  error: result ? undefined : 'Ошибка загрузки',
                }
              : f
          )
        )

        return result
      } finally {
        setIsUploading(false)
      }
    },
    [uploadFile]
  )

  /**
   * Загрузить несколько файлов параллельно
   */
  const uploadMany = useCallback(
    async (fileList: FileList | File[]): Promise<UploadedImage[]> => {
      const filesArray = Array.from(fileList)
      const results = await Promise.all(filesArray.map(upload))
      return results.filter((r): r is UploadedImage => r !== null)
    },
    [upload]
  )

  /**
   * Удалить файл из списка и очистить blob URL
   */
  const removeFile = useCallback((localId: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.localId === localId)
      if (file) {
        URL.revokeObjectURL(file.previewUrl)
      }
      return prev.filter((f) => f.localId !== localId)
    })
  }, [])

  /**
   * Очистить все файлы
   */
  const clearFiles = useCallback(() => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl))
    setFiles([])
  }, [files])

  /**
   * Получить успешно загруженные изображения
   */
  const getUploadedImages = useCallback((): UploadedImage[] => {
    return files
      .filter((f) => f.status === 'success' && f.imageId)
      .map((f) => ({
        id: f.imageId!,
        url: `/api/images/${f.imageId}`,
        filename: f.file.name,
      }))
  }, [files])

  return {
    /** Загрузить один файл */
    upload,
    /** Загрузить несколько файлов */
    uploadMany,
    /** Список загружаемых/загруженных файлов */
    files,
    /** Загрузка в процессе */
    isUploading,
    /** Удалить файл из списка */
    removeFile,
    /** Очистить все файлы */
    clearFiles,
    /** Получить успешно загруженные */
    getUploadedImages,
    /** Валидировать файл */
    validateFile,
  }
}
