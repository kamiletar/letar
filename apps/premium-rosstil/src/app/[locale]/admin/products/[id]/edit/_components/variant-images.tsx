'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { Image as ImageModel, VariantImage } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import { Box, Button, Card, Heading, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import type { DragEndEvent } from '@dnd-kit/core'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Image from 'next/image'
import { useEffect, useState, useTransition } from 'react'
import { deleteVariantImage } from '../_actions/delete-image'
import { reorderVariantImages } from '../_actions/reorder-images'
import { ImageUpload } from './image-upload'

// Тип VariantImage с включённой связью image
type VariantImageWithImage = VariantImage & {
  image: ImageModel
}

interface VariantImagesProps {
  productId: string
  variantId: string
  images: VariantImageWithImage[]
}

/**
 * Получает URL изображения из пути.
 */
function getImageUrl(path: string): string {
  return `/api/files/${path}`
}

/**
 * Компонент одного изображения с возможностью сортировки.
 */
function SortableImage({ image, onDelete }: { image: VariantImageWithImage; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const imageUrl = getImageUrl(image.image.path)

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      position="relative"
      borderWidth="2px"
      borderColor={isDragging ? 'blue.500' : 'border'}
      borderRadius="md"
      overflow="hidden"
      cursor="grab"
      _active={{ cursor: 'grabbing' }}
      width="150px"
      height="150px"
    >
      <Image
        src={imageUrl}
        alt={image.alt || 'Изображение варианта'}
        fill
        style={{ objectFit: 'cover' }}
        sizes="150px"
      />
      <IconButton
        position="absolute"
        top={1}
        right={1}
        size="xs"
        colorPalette="red"
        variant="solid"
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Удалить изображение"
        zIndex={2}
      >
        ×
      </IconButton>
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg="blackAlpha.700"
        color="white"
        fontSize="xs"
        textAlign="center"
        py={1}
        zIndex={1}
      >
        #{image.order + 1}
      </Box>
    </Box>
  )
}

/**
 * Компонент управления изображениями варианта продукта.
 * Поддерживает drag-and-drop переупорядочивание, загрузку и удаление.
 */
export function VariantImages({ productId, variantId, images }: VariantImagesProps) {
  const router = useRouter()
  const [localImages, setLocalImages] = useState(images)
  const [showUpload, setShowUpload] = useState(false)
  const [_isPending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Синхронизируем локальное состояние с пропсами при обновлении
  useEffect(() => {
    setLocalImages(images)
  }, [images])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = localImages.findIndex((item) => item.id === active.id)
      const newIndex = localImages.findIndex((item) => item.id === over.id)
      const reordered = arrayMove(localImages, oldIndex, newIndex)

      // Обновляем локальное состояние для мгновенной реакции
      setLocalImages(reordered)

      // Сохраняем новый порядок на сервере
      startTransition(async () => {
        try {
          await reorderVariantImages(
            productId,
            reordered.map((img, index) => ({ id: img.id, order: index }))
          )
          toaster.success({
            title: 'Порядок изменен',
            description: 'Новый порядок изображений сохранен',
          })
        } catch (error) {
          toaster.error({
            title: 'Ошибка',
            description: error instanceof Error ? error.message : 'Не удалось изменить порядок',
          })
          // Откатываем изменения при ошибке
          setLocalImages(localImages)
        }
      })
    }
  }

  const handleDelete = (imageId: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить это изображение?')) {
      return
    }

    startTransition(async () => {
      try {
        await deleteVariantImage(productId, imageId)
        setLocalImages((prev) => prev.filter((img) => img.id !== imageId))
        toaster.success({
          title: 'Изображение удалено',
        })
      } catch (error) {
        toaster.error({
          title: 'Ошибка',
          description: error instanceof Error ? error.message : 'Не удалось удалить изображение',
        })
      }
    })
  }

  const handleUploadSuccess = () => {
    setShowUpload(false)
    // Обновляем данные на странице после загрузки
    router.refresh()
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md" textTransform="none">
            Изображения ({localImages.length})
          </Heading>
          <Button size="sm" colorPalette="fg" onClick={() => setShowUpload(!showUpload)}>
            {showUpload ? 'Скрыть загрузку' : 'Добавить изображения'}
          </Button>
        </HStack>
      </Card.Header>

      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Форма загрузки */}
          {showUpload && <ImageUpload productId={productId} variantId={variantId} onSuccess={handleUploadSuccess} />}

          {/* Список изображений */}
          {localImages.length === 0 ? (
            <Text color="fg.muted" fontSize="sm">
              Нет изображений. Добавьте фотографии варианта.
            </Text>
          ) : (
            <>
              <Text fontSize="sm" color="fg.muted">
                Перетаскивайте изображения для изменения порядка
              </Text>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localImages.map((img) => img.id)} strategy={rectSortingStrategy}>
                  <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={4}>
                    {localImages.map((image) => (
                      <SortableImage key={image.id} image={image} onDelete={() => handleDelete(image.id)} />
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
