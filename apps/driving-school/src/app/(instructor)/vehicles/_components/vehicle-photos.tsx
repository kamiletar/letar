'use client'

/**
 * Управление фотографиями автомобиля
 *
 * @module vehicle-photos
 *
 * Структура модуля:
 * - vehicle-photos.types.ts — типы и хелперы
 * - use-vehicle-photos.ts — хук управления состоянием
 * - photo-dropzone.tsx — зона загрузки
 * - upload-queue.tsx — очередь файлов
 * - sortable-image.tsx — сортируемое изображение
 */

import { Box, Button, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { LuPlus } from 'react-icons/lu'

import { VEHICLE_PHOTO_LIMITS } from '@/app/_constants'

import { useVehiclePhotos } from '../_hooks/use-vehicle-photos'
import { PhotoDropzone } from './photo-dropzone'
import { SortableImage } from './sortable-image'
import { UploadQueue } from './upload-queue'
import type { VehiclePhotosProps } from './vehicle-photos.types'

const { MAX_PHOTOS } = VEHICLE_PHOTO_LIMITS

/**
 * Компонент управления фотографиями автомобиля.
 * Поддерживает drag-and-drop переупорядочивание, загрузку и удаление.
 */
export function VehiclePhotos({ vehicleId, files }: VehiclePhotosProps) {
  const {
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
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleInputChange,
    uploadFiles,
    removeFile,
    handleDragEnd,
    handleDelete,
  } = useVehiclePhotos({ vehicleId, initialFiles: files })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md" textTransform="none">
            Фотографии ({localFiles.length}/{MAX_PHOTOS})
          </Heading>
          {canUploadMore && (
            <Button size="sm" colorPalette="brand" onClick={() => setShowUpload(!showUpload)}>
              <LuPlus />
              {showUpload ? 'Скрыть' : 'Добавить'}
            </Button>
          )}
        </HStack>
      </Card.Header>

      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Форма загрузки */}
          {showUpload && canUploadMore && (
            <VStack gap={4} align="stretch">
              {/* Dropzone */}
              <PhotoDropzone
                isDragging={isDragging}
                remainingSlots={remainingSlots - pendingCount}
                inputRef={inputRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onInputChange={handleInputChange}
              />

              {/* Очередь файлов */}
              <UploadQueue
                queue={uploadQueue}
                pendingCount={pendingCount}
                uploadingCount={uploadingCount}
                onUploadAll={uploadFiles}
                onRemove={removeFile}
              />
            </VStack>
          )}

          {/* Сообщение о лимите */}
          {!canUploadMore && localFiles.length > 0 && (
            <Text fontSize="sm" color="orange.fg">
              Достигнут лимит в {MAX_PHOTOS} фотографий. Удалите одну, чтобы добавить новую.
            </Text>
          )}

          {/* Список изображений */}
          {localFiles.length === 0 ? (
            <Text color="fg.muted" fontSize="sm">
              Нет фотографий. Добавьте фото автомобиля.
            </Text>
          ) : (
            <>
              <Text fontSize="sm" color="fg.muted">
                Перетаскивайте фото для изменения порядка
              </Text>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localFiles.map((f) => f.id)} strategy={rectSortingStrategy}>
                  <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={4}>
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
      </Card.Body>
    </Card.Root>
  )
}
