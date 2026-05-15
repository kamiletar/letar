'use client'

/**
 * Диалог управления фотографиями автомобиля
 *
 * Позволяет загружать, обрезать, сортировать и удалять фотографии
 */

import { toaster } from '@/app/_components/ui/toaster'
import type { VehicleData, VehicleFileData } from '@/app/_components/vehicle-card'
import { Box, Button, Center, CloseButton, Dialog, HStack, Portal, Spinner, Text, VStack } from '@chakra-ui/react'
import type { DragEndEvent } from '@dnd-kit/core'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { LuCamera } from 'react-icons/lu'
import { MAX_PHOTOS, SortableImage, type UploadedFile, VehiclePhotosUploader } from './vehicle-photos'

// Ленивая загрузка Cropper — react-easy-crop (~15KB) загружается только при обрезке
const VehiclePhotosCropper = dynamic(
  () => import('./vehicle-photos').then((mod) => ({ default: mod.VehiclePhotosCropper })),
  {
    ssr: false,
    loading: () => (
      <Center h="400px">
        <Spinner size="lg" colorPalette="brand" />
      </Center>
    ),
  }
)

interface VehiclePhotosDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle: VehicleData | null
  /** Вызывается когда фото были изменены (добавлены, удалены, изменён порядок) */
  onPhotosChanged?: () => void
}

export function VehiclePhotosDialog({ open, onOpenChange, vehicle, onPhotosChanged }: VehiclePhotosDialogProps) {
  const router = useRouter()
  const [localFiles, setLocalFiles] = useState<VehicleFileData[]>([])
  const [uploadQueue, setUploadQueue] = useState<UploadedFile[]>([])
  const [, startTransition] = useTransition()

  // Состояние кроппера
  const [cropperImage, setCropperImage] = useState<string | null>(null)
  const [cropperFileName, setCropperFileName] = useState<string>('')
  const [filesToCrop, setFilesToCrop] = useState<File[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Уведомить родителя об изменениях и обновить страницу
  const notifyChange = useCallback(() => {
    router.refresh()
    onPhotosChanged?.()
  }, [router, onPhotosChanged])

  // Синхронизируем локальное состояние с пропсами при открытии диалога или изменении vehicle
  useEffect(() => {
    if (open && vehicle) {
      setLocalFiles(vehicle.files)
    }
  }, [open, vehicle])

  // Открыть cropper для файла
  const openCropper = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      setCropperImage(reader.result as string)
      setCropperFileName(file.name)
    }
    reader.readAsDataURL(file)
  }, [])

  // Обработка выбранных файлов — первый открываем, остальные в очередь
  const handleFilesSelected = useCallback(
    (files: File[]) => {
      if (files.length === 0) {
        return
      }

      // Если кроппер уже открыт — все файлы в очередь
      if (cropperImage) {
        setFilesToCrop((prev) => [...prev, ...files])
      } else {
        // Первый файл открываем сразу, остальные в очередь
        const [first, ...rest] = files
        if (rest.length > 0) {
          setFilesToCrop((prev) => [...prev, ...rest])
        }
        openCropper(first)
      }
    },
    [cropperImage, openCropper]
  )

  // Автоматическая загрузка одного файла
  const uploadFile = useCallback(
    async (uploadedFile: UploadedFile) => {
      const formData = new FormData()
      formData.append('file', uploadedFile.file)
      formData.append('vehicleId', vehicle?.id ?? '')

      try {
        const response = await fetch('/api/upload/vehicles', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        URL.revokeObjectURL(uploadedFile.preview)
        toaster.success({ title: 'Фото загружено' })
        notifyChange()
      } catch (error) {
        toaster.error({
          title: 'Ошибка загрузки',
          description: error instanceof Error ? error.message : 'Не удалось загрузить фото',
        })
      }
    },
    [vehicle?.id, notifyChange]
  )

  // Обработчик подтверждения обрезки — сразу загружаем и открываем следующий
  const handleCropConfirm = useCallback(
    (uploadedFile: UploadedFile) => {
      // Загружаем сразу после обрезки
      uploadFile(uploadedFile)

      // Открываем следующий файл из очереди
      if (filesToCrop.length > 0) {
        const [next, ...rest] = filesToCrop
        setFilesToCrop(rest)
        openCropper(next)
      } else {
        setCropperImage(null)
        setCropperFileName('')
      }
    },
    [uploadFile, filesToCrop, openCropper]
  )

  // Закрыть кроппер (пропустить файл и перейти к следующему)
  const handleCropCancel = useCallback(() => {
    if (filesToCrop.length > 0) {
      const [next, ...rest] = filesToCrop
      setFilesToCrop(rest)
      openCropper(next)
    } else {
      setCropperImage(null)
      setCropperFileName('')
    }
  }, [filesToCrop, openCropper])

  // Удалить файл из очереди
  const handleRemoveFile = useCallback((fileItem: UploadedFile) => {
    URL.revokeObjectURL(fileItem.preview)
    setUploadQueue((prev) => prev.filter((f) => f !== fileItem))
  }, [])

  // Обработчик завершения загрузки
  const handleUploadComplete = useCallback(() => {
    notifyChange()
  }, [notifyChange])

  // Обработчик drag & drop для сортировки
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (!vehicle) {
        return
      }

      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = localFiles.findIndex((item) => item.id === active.id)
        const newIndex = localFiles.findIndex((item) => item.id === over.id)
        const reordered = arrayMove(localFiles, oldIndex, newIndex)

        setLocalFiles(reordered)

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

            toaster.success({ title: 'Порядок изменён' })
            notifyChange()
          } catch {
            toaster.error({ title: 'Ошибка', description: 'Не удалось изменить порядок' })
            setLocalFiles(vehicle.files)
          }
        })
      }
    },
    [vehicle, localFiles, notifyChange]
  )

  // Удаление фото
  const handleDelete = useCallback(
    (fileId: string) => {
      if (!window.confirm('Удалить это фото?')) {
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
          toaster.success({ title: 'Фото удалено' })
          notifyChange()
        } catch {
          toaster.error({ title: 'Ошибка', description: 'Не удалось удалить фото' })
        }
      })
    },
    [notifyChange]
  )

  if (!vehicle) {
    return null
  }

  const pendingCount = uploadQueue.filter((f) => f.status === 'pending').length
  const remainingSlots = MAX_PHOTOS - localFiles.length - pendingCount

  // Диалог кроппера
  if (cropperImage) {
    return (
      <VehiclePhotosCropper
        imageSrc={cropperImage}
        fileName={cropperFileName}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={(details) => onOpenChange(details.open)} placement="center" size="lg">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="xl">
            <Dialog.Header>
              <Dialog.Title>
                <HStack gap={2}>
                  <LuCamera />
                  Фото: {vehicle.brand} {vehicle.model}
                </HStack>
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {/* Uploader с dropzone и очередью */}
                <VehiclePhotosUploader
                  vehicleId={vehicle.id}
                  remainingSlots={remainingSlots}
                  pendingCount={pendingCount}
                  uploadQueue={uploadQueue}
                  onFilesSelected={handleFilesSelected}
                  onRemoveFile={handleRemoveFile}
                  onUploadComplete={handleUploadComplete}
                  setUploadQueue={setUploadQueue}
                />

                {/* Существующие фото */}
                {localFiles.length === 0 ? (
                  <Text color="fg.muted" fontSize="sm" textAlign="center" py={4}>
                    Нет фотографий
                  </Text>
                ) : (
                  <>
                    <Text fontSize="sm" color="fg.muted">
                      Перетаскивайте для изменения порядка ({localFiles.length}/{MAX_PHOTOS})
                    </Text>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={localFiles.map((f) => f.id)} strategy={rectSortingStrategy}>
                        <Box display="flex" flexWrap="wrap" gap={3}>
                          {localFiles.map((vehicleFile) => (
                            <SortableImage
                              key={vehicleFile.id}
                              vehicleFile={vehicleFile}
                              onDelete={() => handleDelete(vehicleFile.id)}
                            />
                          ))}
                        </Box>
                      </SortableContext>
                    </DndContext>
                  </>
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.ActionTrigger asChild>
                <Button variant="outline">Закрыть</Button>
              </Dialog.ActionTrigger>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
