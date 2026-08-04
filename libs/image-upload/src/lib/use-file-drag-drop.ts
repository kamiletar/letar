'use client'

import { useCallback, useState } from 'react'

/**
 * Опции для хука useFileDragDrop.
 */
export interface UseFileDragDropOptions {
  /** Callback для загрузки файла */
  onUpload: (file: File) => Promise<void>
  /** MIME типы для валидации (default: 'image/*') */
  acceptTypes?: string
  /** Разрешить множественный выбор (default: false) */
  multiple?: boolean
  /** Отключено (default: false) */
  disabled?: boolean
}

/**
 * Возвращаемое значение хука useFileDragDrop.
 */
export interface UseFileDragDropReturn {
  /** Файл над зоной drop */
  isDragging: boolean
  /** Идёт загрузка */
  isUploading: boolean
  /** Текст ошибки */
  error: string | null
  /** Обработчики для drag зоны */
  dragHandlers: {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
  /** Обработчик выбора файла через input */
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Очистить ошибку */
  clearError: () => void
  /** Установить текст ошибки вручную */
  setError: (message: string | null) => void
  /** Установить состояние uploading вручную */
  setIsUploading: (value: boolean) => void
}

/**
 * Хук для drag-n-drop загрузки файлов.
 * Инкапсулирует общую логику drag/drop, валидации и состояний.
 *
 * Не привязан к изображениям: `acceptTypes` принимает любой MIME-шаблон,
 * поэтому хук годится и для аудио, и для документов.
 *
 * @example
 * ```tsx
 * const { isDragging, isUploading, error, dragHandlers, handleFileSelect } = useFileDragDrop({
 *   onUpload: async (file) => {
 *     const formData = new FormData()
 *     formData.append('file', file)
 *     await fetch('/api/upload', { method: 'POST', body: formData })
 *   },
 *   acceptTypes: 'image/*',
 * })
 *
 * return (
 *   <Box {...dragHandlers}>
 *     <input type="file" onChange={handleFileSelect} />
 *   </Box>
 * )
 * ```
 */
export function useFileDragDrop(options: UseFileDragDropOptions): UseFileDragDropReturn {
  const { onUpload, acceptTypes = 'image/*', multiple = false, disabled = false } = options

  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Валидирует файл по MIME типу.
   */
  const validateFile = useCallback(
    (file: File): boolean => {
      // Парсим acceptTypes: 'image/*' → 'image', 'audio/mp3' → 'audio/mp3'
      if (acceptTypes.endsWith('/*')) {
        const baseType = acceptTypes.replace('/*', '')
        return file.type.startsWith(baseType + '/')
      }
      return file.type === acceptTypes
    },
    [acceptTypes],
  )

  /**
   * Получает сообщение об ошибке для типа файла.
   */
  const getTypeErrorMessage = useCallback((): string => {
    if (acceptTypes.startsWith('image')) {
      return 'Файл должен быть изображением'
    }
    if (acceptTypes.startsWith('audio')) {
      return 'Файл должен быть аудио'
    }
    return 'Неподдерживаемый тип файла'
  }, [acceptTypes])

  /**
   * Загружает один файл с валидацией.
   */
  const uploadFile = useCallback(
    async (file: File) => {
      if (!validateFile(file)) {
        setError(getTypeErrorMessage())
        return
      }

      setIsUploading(true)
      setError(null)

      try {
        await onUpload(file)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setIsUploading(false)
      }
    },
    [onUpload, validateFile, getTypeErrorMessage],
  )

  /**
   * Обработчик drop события.
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled) {
        return
      }

      const files = Array.from(e.dataTransfer.files)
      if (files.length === 0) {
        return
      }

      if (multiple) {
        // Загружаем все файлы
        files.forEach((file) => uploadFile(file))
      } else {
        // Загружаем только первый
        uploadFile(files[0])
      }
    },
    [disabled, multiple, uploadFile],
  )

  /**
   * Обработчик выбора файла через input.
   */
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) {
        return
      }

      const files = e.target.files
      if (!files || files.length === 0) {
        return
      }

      if (multiple) {
        Array.from(files).forEach((file) => uploadFile(file))
      } else {
        uploadFile(files[0])
      }

      // Сброс input для возможности повторной загрузки того же файла
      e.target.value = ''
    },
    [disabled, multiple, uploadFile],
  )

  /**
   * Обработчики для drag зоны.
   */
  const dragHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragging(true)
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
    },
    onDrop: handleDrop,
  }

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    isDragging,
    isUploading,
    error,
    dragHandlers,
    handleFileSelect,
    clearError,
    setError,
    setIsUploading,
  }
}
