'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { DragEndEvent } from '@dnd-kit/core'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { LuPlus } from 'react-icons/lu'

import { ImageUploadZone } from './image-upload-zone'
import { SortableImage } from './sortable-image'
import type { LocationImagesProps, UploadedFile } from './types'
import { UploadQueue } from './upload-queue'

/**
 * Компонент управления изображениями филиала.
 * Поддерживает drag-and-drop переупорядочивание, загрузку и удаление.
 */
export function LocationImages({ locationId, files }: LocationImagesProps) {
  const router = useRouter()
  const [localFiles, setLocalFiles] = useState(files)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadQueue, setUploadQueue] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Синхронизируем локальное состояние с пропсами при обновлении
  useEffect(() => {
    setLocalFiles(files)
  }, [files])

  // Обработчики drag-and-drop для загрузки файлов
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) {
      return
    }

    const newFiles: UploadedFile[] = Array.from(fileList).map((file) => ({
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
    // Используем preview URL как уникальный идентификатор (ссылки на объекты меняются при setState)
    const successfulPreviews: string[] = []

    for (const fileItem of pendingFiles) {
      setUploadQueue((prev) => prev.map((f) => (f.preview === fileItem.preview ? { ...f, status: 'uploading' } : f)))

      const formData = new FormData()
      formData.append('file', fileItem.file)
      formData.append('locationId', locationId)

      try {
        const response = await fetch('/api/upload/locations', {
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

      // Удаляем успешные из списка (сравниваем по preview URL)
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
          const response = await fetch('/api/upload/locations', {
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
          setLocalFiles(files)
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
        const response = await fetch(`/api/upload/locations?id=${fileId}`, {
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

  const pendingCount = uploadQueue.filter((f) => f.status === 'pending').length
  const uploadingCount = uploadQueue.filter((f) => f.status === 'uploading').length

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md" textTransform="none">
            Фотографии ({localFiles.length})
          </Heading>
          <Button size="sm" colorPalette="brand" onClick={() => setShowUpload(!showUpload)}>
            <LuPlus />
            {showUpload ? 'Скрыть' : 'Добавить'}
          </Button>
        </HStack>
      </Card.Header>

      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Форма загрузки */}
          {showUpload && (
            <VStack gap={4} align="stretch">
              <ImageUploadZone
                ref={inputRef}
                isDragging={isDragging}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                onInputChange={handleInputChange}
              />

              <UploadQueue
                queue={uploadQueue}
                pendingCount={pendingCount}
                uploadingCount={uploadingCount}
                onUpload={uploadFiles}
                onRemove={removeFile}
              />
            </VStack>
          )}

          {/* Список изображений */}
          {localFiles.length === 0 ? (
            <Text color="fg.muted" fontSize="sm">
              Нет фотографий. Добавьте фото филиала.
            </Text>
          ) : (
            <>
              <Text fontSize="sm" color="fg.muted">
                Перетаскивайте фото для изменения порядка
              </Text>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localFiles.map((f) => f.id)} strategy={rectSortingStrategy}>
                  <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={4}>
                    {localFiles.map((locationFile) => (
                      <SortableImage
                        key={locationFile.id}
                        locationFile={locationFile}
                        onDelete={() => handleDelete(locationFile.id)}
                      />
                    ))}
                  </Box>
                </SortableContext>
              </DndContext>
            </>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
