'use client'

import type { Image as ImageModel, ProductImage } from '@/generated/prisma'
import { getImageUrl } from '@/lib/images/get-image-url'
import {
  Box,
  Button,
  Center,
  Flex,
  Float,
  Grid,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useImageUpload } from '@letar/image-upload'
import { FileTrigger } from '@letar/ui'
import NextImage from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { LuGripVertical, LuImage, LuPlus, LuTrash2 } from 'react-icons/lu'

/** ProductImage с Image relation */
export type ProductImageWithImage = ProductImage & { image: ImageModel }

/** Изображение в редакторе */
interface ImageItem {
  id: string // Временный ID или ProductImage.id
  imageId: string
  order: number
  url: string
  isNew?: boolean // true если только что загружено
}

interface ProductImagesUploadProps {
  /** ID продукта (для существующих) */
  productId?: string
  /** Начальные изображения */
  initialImages?: ProductImageWithImage[]
  /** Callback при изменении списка изображений */
  onChange: (images: Array<{ imageId: string; order: number }>) => void
  /** Отключено */
  disabled?: boolean
}

/**
 * Компонент загрузки множества изображений для товара.
 * Поддерживает drag-n-drop загрузку и ручной reorder.
 */
export function ProductImagesUpload({
  productId: _productId,
  initialImages,
  onChange,
  disabled,
}: ProductImagesUploadProps) {
  const [images, setImages] = useState<ImageItem[]>([])

  // Инициализация из initialImages
  useEffect(() => {
    if (initialImages) {
      const items: ImageItem[] = initialImages.map((pi) => ({
        id: pi.id,
        imageId: pi.imageId,
        order: pi.order,
        url: getImageUrl(pi.image.path),
      }))
      setImages(items.sort((a, b) => a.order - b.order))
    }
  }, [initialImages])

  // Уведомляем родителя об изменениях
  const notifyChange = useCallback(
    (newImages: ImageItem[]) => {
      onChange(
        newImages.map((img, idx) => ({
          imageId: img.imageId,
          order: idx,
        })),
      )
    },
    [onChange],
  )

  // Хук загрузки изображений
  const {
    isDragging,
    isUploading,
    error: uploadError,
    dragHandlers,
    handleFileSelect,
  } = useImageUpload({
    category: 'PRODUCT',
    multiple: true,
    disabled,
    onUploadSuccess: (result) => {
      // Добавляем новое изображение
      const newImage: ImageItem = {
        id: `new-${Date.now()}-${Math.random()}`,
        imageId: result.id,
        order: images.length,
        url: result.url,
        isNew: true,
      }

      const newImages = [...images, newImage]
      setImages(newImages)
      notifyChange(newImages)
    },
  })

  // Удаление изображения
  const handleRemove = useCallback(
    (id: string) => {
      const newImages = images.filter((img) => img.id !== id)
      setImages(newImages)
      notifyChange(newImages)
    },
    [images, notifyChange],
  )

  // Перемещение изображения (вверх/вниз)
  const handleMove = useCallback(
    (id: string, direction: 'up' | 'down') => {
      const idx = images.findIndex((img) => img.id === id)
      if (idx === -1) {
        return
      }

      const newIdx = direction === 'up' ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= images.length) {
        return
      }

      const newImages = [...images]
      ;[newImages[idx], newImages[newIdx]] = [newImages[newIdx], newImages[idx]]
      setImages(newImages)
      notifyChange(newImages)
    },
    [images, notifyChange],
  )

  return (
    <VStack align="stretch" gap={4}>
      {/* Заголовок */}
      <HStack justify="space-between">
        <Text fontWeight="medium">Изображения товара</Text>
        <Text fontSize="sm" color="fg.muted">
          {images.length} шт.
        </Text>
      </HStack>

      {/* Сетка изображений */}
      {images.length > 0 && (
        <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={3}>
          {images.map((img, idx) => (
            <Box
              key={img.id}
              position="relative"
              borderRadius="lg"
              overflow="hidden"
              borderWidth="2px"
              borderColor={idx === 0 ? 'purple.500' : 'border.subtle'}
              bg="bg.muted"
            >
              <Box position="relative" aspectRatio={1}>
                <NextImage
                  src={img.url}
                  alt={`Изображение ${idx + 1}`}
                  fill
                  sizes="150px"
                  style={{ objectFit: 'cover' }}
                />
              </Box>

              {/* Главное изображение метка */}
              {idx === 0 && (
                <Box position="absolute" top={1} left={1} bg="purple.500" px={2} py={0.5} borderRadius="md">
                  <Text fontSize="2xs" fontWeight="bold" color="white">
                    Главное
                  </Text>
                </Box>
              )}

              {/* Контролы */}
              <Float placement="top-end" offset="4">
                <HStack gap={1}>
                  <IconButton
                    aria-label="Удалить"
                    size="xs"
                    colorPalette="red"
                    variant="solid"
                    rounded="full"
                    onClick={() => handleRemove(img.id)}
                    disabled={disabled}
                  >
                    <LuTrash2 />
                  </IconButton>
                </HStack>
              </Float>

              {/* Кнопки перемещения */}
              <Flex position="absolute" bottom={1} left={1} right={1} justify="center" gap={1}>
                <IconButton
                  aria-label="Вверх"
                  size="xs"
                  variant="solid"
                  bg="blackAlpha.700"
                  _hover={{ bg: 'blackAlpha.800' }}
                  onClick={() => handleMove(img.id, 'up')}
                  disabled={disabled || idx === 0}
                >
                  <Icon>
                    <LuGripVertical />
                  </Icon>
                </IconButton>
                <Text fontSize="xs" color="white" bg="blackAlpha.700" px={2} py={1} borderRadius="md">
                  {idx + 1}
                </Text>
              </Flex>
            </Box>
          ))}
        </Grid>
      )}

      {/* Зона загрузки */}
      <Box
        p={6}
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragging ? 'purple.500' : uploadError ? 'red.500' : 'border.subtle'}
        borderRadius="lg"
        bg={isDragging ? 'purple.950' : 'bg.muted'}
        transitionProperty="border-color, background-color, opacity"
        transitionDuration="0.2s"
        {...dragHandlers}
        cursor={disabled ? 'not-allowed' : 'pointer'}
        opacity={disabled ? 0.5 : 1}
        _hover={!disabled ? { borderColor: 'purple.400' } : undefined}
      >
        <Center>
          {isUploading
            ? (
              <VStack gap={3}>
                <Spinner size="lg" color="purple.500" />
                <Text fontSize="sm" color="fg.muted">
                  Загрузка...
                </Text>
              </VStack>
            )
            : (
              <VStack gap={3}>
                <Icon fontSize="2xl" color="fg.muted">
                  <LuImage />
                </Icon>
                <VStack gap={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    Перетащите изображения сюда
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    или
                  </Text>
                </VStack>
                <FileTrigger accept="image/*" multiple disabled={disabled} onChange={handleFileSelect}>
                  {({ htmlFor }) => (
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      colorPalette="purple"
                      cursor={disabled ? 'not-allowed' : 'pointer'}
                      opacity={disabled ? 0.5 : 1}
                      pointerEvents={disabled ? 'none' : 'auto'}
                    >
                      <label htmlFor={htmlFor}>
                        <LuPlus />
                        Добавить изображения
                      </label>
                    </Button>
                  )}
                </FileTrigger>
                <Text fontSize="xs" color="fg.muted">
                  PNG, JPG, WEBP до 32MB
                </Text>
              </VStack>
            )}
        </Center>
      </Box>

      {/* Ошибка */}
      {uploadError && (
        <Text fontSize="sm" color="red.400">
          {uploadError}
        </Text>
      )}
    </VStack>
  )
}
