'use client'

/**
 * Хук для управления загрузкой фото инструктора
 *
 * @module use-instructor-photo
 */

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import type { Area } from 'react-easy-crop'

import { toaster } from '@/app/_components/ui/toaster'

import { ALLOWED_MIME_TYPES, getCroppedImg, MAX_FILE_SIZE } from './instructor-photo.types'

export interface UseInstructorPhotoOptions {
  /** Текущий URL фото */
  currentPhotoUrl: string | null
  /** Callback при изменении фото */
  onPhotoChange?: (url: string | null) => void
}

export interface UseInstructorPhotoReturn {
  /** URL фото */
  photoUrl: string | null
  /** Выбранное изображение для кропа */
  selectedImage: string | null
  /** Состояние кропа */
  crop: { x: number; y: number }
  /** Масштаб */
  zoom: number
  /** Идёт загрузка */
  isUploading: boolean
  /** Идёт удаление */
  isDeleting: boolean
  /** Открыт ли диалог */
  dialogOpen: boolean
  /** Перетаскивание над зоной */
  isDragging: boolean
  /** Ref для input */
  fileInputRef: React.RefObject<HTMLInputElement | null>
  /** Ref для drop zone */
  dropZoneRef: React.RefObject<HTMLDivElement | null>

  // Сеттеры
  setCrop: (crop: { x: number; y: number }) => void
  setZoom: (zoom: number) => void
  setDialogOpen: (open: boolean) => void

  // Обработчики
  onCropComplete: (croppedArea: Area, croppedAreaPixels: Area) => void
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleDragEnter: (e: React.DragEvent) => void
  handleDragLeave: (e: React.DragEvent) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleSave: () => Promise<void>
  handleDelete: () => Promise<void>
  handleCancel: () => void
}

/**
 * Хук для управления загрузкой фото инструктора
 */
export function useInstructorPhoto({
  currentPhotoUrl,
  onPhotoChange,
}: UseInstructorPhotoOptions): UseInstructorPhotoReturn {
  const router = useRouter()
  const [photoUrl, setPhotoUrl] = useState<string | null>(currentPhotoUrl)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  /** Валидация и обработка файла */
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/') || !ALLOWED_MIME_TYPES.includes(file.type)) {
      toaster.error({
        title: 'Ошибка',
        description: 'Выбранный файл не является изображением',
      })
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toaster.error({
        title: 'Ошибка',
        description: 'Размер файла не должен превышать 5MB',
      })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
      setDialogOpen(true)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // Drag-and-drop обработчики
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
        setIsDragging(false)
      }
    },
    [dropZoneRef]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile]
  )

  /** Сохранение обрезанного фото */
  const handleSave = async () => {
    if (!selectedImage || !croppedAreaPixels) {
      return
    }

    setIsUploading(true)

    try {
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels)
      const formData = new FormData()
      formData.append('file', croppedBlob, 'instructor-photo.jpg')

      const response = await fetch('/api/upload/instructor-photo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки')
      }

      setPhotoUrl(data.url)
      onPhotoChange?.(data.url)

      toaster.success({ title: 'Фото загружено' })

      setDialogOpen(false)
      setSelectedImage(null)
      router.refresh()
    } catch (error) {
      console.error('Upload error:', error)
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось загрузить фото',
      })
    } finally {
      setIsUploading(false)
    }
  }

  /** Удаление фото */
  const handleDelete = async () => {
    if (!photoUrl) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch('/api/upload/instructor-photo', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка удаления')
      }

      setPhotoUrl(null)
      onPhotoChange?.(null)

      toaster.success({ title: 'Фото удалено' })
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      toaster.error({
        title: 'Ошибка',
        description: 'Не удалось удалить фото',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  /** Отмена выбора */
  const handleCancel = () => {
    setDialogOpen(false)
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return {
    photoUrl,
    selectedImage,
    crop,
    zoom,
    isUploading,
    isDeleting,
    dialogOpen,
    isDragging,
    fileInputRef,
    dropZoneRef,
    setCrop,
    setZoom,
    setDialogOpen,
    onCropComplete,
    handleFileSelect,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleSave,
    handleDelete,
    handleCancel,
  }
}
