'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createUploadResponseResolver, DEFAULT_IMAGE_ENDPOINT } from './image-url'
import type { ImageCategory, UploadedImage, UploadingFile, UploadResponseResolver } from './types'
import { useFileDragDrop } from './use-file-drag-drop'

export interface UseImageUploadOptions {
  /**
   * Endpoint для загрузки
   * @default '/api/upload'
   */
  uploadEndpoint?: string
  /**
   * Endpoint, из которого собирается ссылка, если сервер вернул только `id`
   * @default '/api/images'
   */
  imageEndpoint?: string
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
   * Разрешить множественный выбор в drag-n-drop зоне
   * @default false
   */
  multiple?: boolean
  /**
   * Отключить загрузку
   * @default false
   */
  disabled?: boolean
  /**
   * Как превратить ответ сервера в {@link UploadedImage}.
   *
   * По умолчанию понимает и `{ url }` (файл на диске), и `{ id }`
   * (запись `Image` в БД, ссылка собирается из `imageEndpoint`).
   */
  resolveUploadResponse?: UploadResponseResolver
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
 * Хук для загрузки изображений.
 *
 * Держит очередь файлов со статусами и одновременно даёт готовые обработчики
 * drag-n-drop — отдельный хук для зоны перетаскивания подключать не нужно.
 *
 * @example
 * ```tsx
 * const { upload, isUploading, isDragging, dragHandlers, handleFileSelect } = useImageUpload({
 *   category: 'PRODUCT',
 *   onUploadSuccess: (image) => console.log('Загружено:', image.id, image.url),
 * })
 *
 * <Box {...dragHandlers}>
 *   <input type="file" onChange={handleFileSelect} />
 * </Box>
 * ```
 *
 * @example Сервер отдаёт готовую ссылку вместо идентификатора
 * ```tsx
 * const { upload } = useImageUpload({
 *   uploadEndpoint: '/api/files/upload',
 *   resolveUploadResponse: (data, file) => ({
 *     id: String(data.path),
 *     url: String(data.url),
 *     filename: file.name,
 *   }),
 * })
 * ```
 */
export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    uploadEndpoint = '/api/upload',
    imageEndpoint = DEFAULT_IMAGE_ENDPOINT,
    category = 'OTHER',
    maxSize = DEFAULT_MAX_SIZE,
    acceptedTypes = DEFAULT_ACCEPTED_TYPES,
    multiple = false,
    disabled = false,
    resolveUploadResponse,
    onUploadSuccess,
    onUploadError,
  } = options

  const [files, setFiles] = useState<UploadingFile[]>([])
  const [lastUpload, setLastUpload] = useState<UploadedImage | null>(null)

  const resolveResponse = useMemo(
    () => resolveUploadResponse ?? createUploadResponseResolver({ imageEndpoint }),
    [resolveUploadResponse, imageEndpoint],
  )

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
    [maxSize, acceptedTypes],
  )

  // Позднее связывание: зона drag-n-drop создаётся раньше, чем сама функция
  // загрузки, а та, в свою очередь, пишет ошибку в состояние этой зоны.
  // Ref разрывает цикл, не заводя второго источника состояния ошибки.
  const uploadRef = useRef<((file: File) => Promise<UploadedImage | null>) | null>(null)

  const handleDroppedFile = useCallback(async (file: File) => {
    await uploadRef.current?.(file)
  }, [])

  const dragDrop = useFileDragDrop({
    onUpload: handleDroppedFile,
    // Точную проверку MIME делает validateFile по acceptedTypes;
    // здесь достаточно грубого отсечения «это вообще не картинка»
    acceptTypes: 'image/*',
    multiple,
    disabled,
  })

  const { setError } = dragDrop

  /**
   * Загрузить файл: поставить в очередь, отправить на сервер, обновить статус.
   *
   * Не бросает исключений — при неудаче возвращает `null`, пишет текст в
   * `error` и вызывает `onUploadError`.
   */
  const upload = useCallback(
    async (file: File): Promise<UploadedImage | null> => {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        onUploadError?.(validationError, file)
        return null
      }

      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const previewUrl = URL.createObjectURL(file)

      setFiles((prev) => [...prev, { localId, file, previewUrl, status: 'uploading' }])

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('category', category)

        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
        })

        const data = ((await response.json().catch(() => ({}))) ?? {}) as Record<string, unknown>

        if (!response.ok) {
          const serverError = typeof data.error === 'string' ? data.error : ''
          throw new Error(serverError || `Ошибка загрузки: ${response.status}`)
        }

        const image = resolveResponse(data, file)

        setFiles((prev) =>
          prev.map((f) => (f.localId === localId ? { ...f, status: 'success', imageId: image.id, url: image.url } : f))
        )
        setLastUpload(image)
        onUploadSuccess?.(image)

        return image
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Ошибка загрузки'

        setFiles((prev) => prev.map((f) => (f.localId === localId ? { ...f, status: 'error', error: message } : f)))
        setError(message)
        onUploadError?.(message, file)

        return null
      }
    },
    [uploadEndpoint, category, validateFile, resolveResponse, setError, onUploadSuccess, onUploadError],
  )

  useEffect(() => {
    uploadRef.current = upload
  }, [upload])

  /**
   * Загрузить несколько файлов параллельно
   */
  const uploadMany = useCallback(
    async (fileList: FileList | File[]): Promise<UploadedImage[]> => {
      const filesArray = Array.from(fileList)
      const results = await Promise.all(filesArray.map(upload))
      return results.filter((r): r is UploadedImage => r !== null)
    },
    [upload],
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
    setFiles((prev) => {
      // revokeObjectURL идемпотентен, поэтому повторный вызов апдейтера
      // в StrictMode безопасен
      prev.forEach((f) => URL.revokeObjectURL(f.previewUrl))
      return []
    })
  }, [])

  /**
   * Получить успешно загруженные изображения
   */
  const getUploadedImages = useCallback((): UploadedImage[] => {
    return files
      .filter((f) => f.status === 'success' && f.imageId && f.url)
      .map((f) => ({
        id: f.imageId as string,
        url: f.url as string,
        filename: f.file.name,
      }))
  }, [files])

  // Состояние очереди — единственный надёжный признак: `isUploading` внутри
  // drag-n-drop гаснет по завершении ПЕРВОГО файла, а не последнего
  const isQueueUploading = files.some((f) => f.status === 'uploading')

  return {
    /** Загрузить один файл */
    upload,
    /** Загрузить несколько файлов */
    uploadMany,
    /** Список загружаемых/загруженных файлов */
    files,
    /** Загрузка в процессе */
    isUploading: isQueueUploading || dragDrop.isUploading,
    /** Последнее успешно загруженное изображение */
    lastUpload,
    /** Удалить файл из списка */
    removeFile,
    /** Очистить все файлы */
    clearFiles,
    /** Получить успешно загруженные */
    getUploadedImages,
    /** Валидировать файл */
    validateFile,
    /** Файл перетаскивают над зоной */
    isDragging: dragDrop.isDragging,
    /** Текст последней ошибки */
    error: dragDrop.error,
    /** Очистить ошибку */
    clearError: dragDrop.clearError,
    /** Обработчики для зоны перетаскивания */
    dragHandlers: dragDrop.dragHandlers,
    /** Обработчик `<input type="file">` */
    handleFileSelect: dragDrop.handleFileSelect,
  }
}
