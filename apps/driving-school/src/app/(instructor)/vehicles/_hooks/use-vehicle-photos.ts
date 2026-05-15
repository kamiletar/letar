'use client'

/**
 * Хук для управления фотографиями автомобиля
 */

import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import { toaster } from '@/app/_components/ui/toaster'
import { VEHICLE_PHOTO_LIMITS } from '@/app/_constants'

import type { UploadedFile, VehicleFileWithFile } from '../_components/vehicle-photos.types'

const { MAX_PHOTOS } = VEHICLE_PHOTO_LIMITS

export interface UseVehiclePhotosOptions {
  vehicleId: string
  initialFiles: VehicleFileWithFile[]
}

export interface UseVehiclePhotosReturn {
  /** Локальный список файлов */
  localFiles: VehicleFileWithFile[]
  /** Показывать форму загрузки */
  showUpload: boolean
  /** Очередь файлов на загрузку */
  uploadQueue: UploadedFile[]
  /** Флаг перетаскивания файла над dropzone */
  isDragging: boolean
  /** Ref для input элемента */
  inputRef: React.RefObject<HTMLInputElement | null>
  /** Сколько ещё можно загрузить */
  remainingSlots: number
  /** Можно ли загрузить ещё */
  canUploadMore: boolean
  /** Количество файлов в ожидании */
  pendingCount: number
  /** Количество файлов в процессе загрузки */
  uploadingCount: number

  // Хэндлеры
  setShowUpload: (show: boolean) => void
  handleFiles: (fileList: FileList | null) => void
  handleDrop: (e: React.DragEvent) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDragLeave: () => void
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  uploadFiles: () => Promise<void>
  removeFile: (fileItem: UploadedFile) => void
  handleDragEnd: (event: DragEndEvent) => void
  handleDelete: (fileId: string) => void
}

/**
 * Хук управления фотографиями автомобиля
 */
export function useVehiclePhotos({ vehicleId, initialFiles }: UseVehiclePhotosOptions): UseVehiclePhotosReturn {
  const router = useRouter()
  const [localFiles, setLocalFiles] = useState(initialFiles)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  // Синхронизируем локальное состояние с пропсами при обновлении
  useEffect(() => {
    setLocalFiles(initialFiles)
  }, [initialFiles])

  // Сколько ещё можно загрузить
  const remainingSlots = MAX_PHOTOS - localFiles.length
  const canUploadMore = remainingSlots > 0
  const pendingCount = uploadQueue.filter((f) => f.status === 'pending').length
  const uploadingCount = uploadQueue.filter((f) => f.status === 'uploading').length

  // Обработчик добавления файлов
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || !canUploadMore) {
      return
    }

    // Ограничиваем количество файлов
    const filesToAdd = Array.from(fileList).slice(0, remainingSlots - pendingCount)

    if (filesToAdd.length === 0) {
      toaster.warning({
        title: 'Лимит фотографий',
        description: `Максимум ${MAX_PHOTOS} фото на автомобиль`,
      })
      return
    }

    const newFiles: UploadedFile[] = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }))

    setUploadQueue((prev) => [...prev, ...newFiles])
    setShowUpload(true)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  // Загрузка файлов на сервер
  const uploadFiles = async () => {
    const pendingFiles = uploadQueue.filter((f) => f.status === 'pending')
    const successfulPreviews: string[] = []

    for (const fileItem of pendingFiles) {
      setUploadQueue((prev) => prev.map((f) => (f.preview === fileItem.preview ? { ...f, status: 'uploading' } : f)))

      const formData = new FormData()
      formData.append('file', fileItem.file)
      formData.append('vehicleId', vehicleId)

      try {
        const response = await fetch('/api/upload/vehicles', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        await response.json()
        successfulPreviews.push(fileItem.preview)
      } catch (error) {
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.preview === fileItem.preview
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Ошибка загрузки',
                }
              : f
          )
        )
      }
    }

    // Очищаем успешно загруженные файлы и обновляем страницу
    if (successfulPreviews.length > 0) {
      // Освобождаем blob URLs
      for (const preview of successfulPreviews) {
        URL.revokeObjectURL(preview)
      }

      // Удаляем успешные из списка
      setUploadQueue((prev) => prev.filter((f) => !successfulPreviews.includes(f.preview)))

      toaster.success({
        title: 'Фотографии загружены',
        description: `Успешно загружено ${successfulPreviews.length} фото`,
      })

      // Обновляем список изображений
      router.refresh()
    }
  }

  const removeFile = (fileItem: UploadedFile) => {
    URL.revokeObjectURL(fileItem.preview)
    setUploadQueue((prev) => prev.filter((f) => f !== fileItem))
  }

  // Обработчик drag-and-drop для переупорядочивания
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localFiles.findIndex((item) => item.id === active.id)
      const newIndex = localFiles.findIndex((item) => item.id === over.id)
      const reordered = arrayMove(localFiles, oldIndex, newIndex)

      // Обновляем локальное состояние для мгновенной реакции
      setLocalFiles(reordered)

      // Сохраняем новый порядок на сервере
      startTransition(async () => {
        try {
          const response = await fetch('/api/upload/vehicles', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files: reordered.map((f, index) => ({ id: f.id, order: index })),
            }),
          })

          if (!response.ok) {
            throw new Error('Failed to reorder')
          }

          toaster.success({
            title: 'Порядок изменён',
            description: 'Новый порядок фотографий сохранён',
          })
        } catch (error) {
          toaster.error({
            title: 'Ошибка',
            description: error instanceof Error ? error.message : 'Не удалось изменить порядок',
          })
          // Откатываем изменения при ошибке
          setLocalFiles(initialFiles)
        }
      })
    }
  }

  const handleDelete = (fileId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить это фото?')) {
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch(`/api/upload/vehicles?id=${fileId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete')
        }

        setLocalFiles((prev) => prev.filter((f) => f.id !== fileId))
        toaster.success({
          title: 'Фото удалено',
        })
      } catch (error) {
        toaster.error({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Не удалось удалить фото',
        })
      }
    })
  }

  return {
    localFiles,
    showUpload,
    uploadQueue,
    isDragging,
    inputRef,
    remainingSlots,
    canUploadMore,
    pendingCount,
    uploadingCount,
    setShowUpload,
    handleFiles,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleInputChange,
    uploadFiles,
    removeFile,
    handleDragEnd,
    handleDelete,
  }
}
