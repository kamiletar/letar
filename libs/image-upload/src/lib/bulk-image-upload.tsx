'use client'

import { Box, Card, HStack, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { Dropzone } from './dropzone'
import { ImagePreview, ImagePreviewGrid } from './image-preview'
import type { ImageCategory, UploadedImage } from './use-image-upload'
import { useImageUpload } from './use-image-upload'

export interface BulkImageUploadProps {
  /**
   * Текущие изображения (массив ID)
   */
  value?: string[]
  /**
   * Callback при изменении
   */
  onChange?: (imageIds: string[]) => void
  /**
   * Максимальное количество изображений
   */
  maxImages?: number
  /**
   * Заголовок секции
   */
  title?: string
  /**
   * Описание
   */
  description?: string
  /**
   * Отключить загрузку
   */
  disabled?: boolean
  /**
   * Категория изображений
   * @default 'OTHER'
   */
  category?: ImageCategory
  /**
   * Endpoint для загрузки
   * @default '/api/upload'
   */
  uploadEndpoint?: string
  /**
   * Endpoint для получения изображений
   * @default '/api/images'
   */
  imageEndpoint?: string
  /**
   * Цветовая схема
   * @default 'blue'
   */
  colorPalette?: string
  /**
   * Размер превью
   * @default 100
   */
  previewSize?: number
  /**
   * Callback при успешной загрузке всех файлов
   */
  onUploadComplete?: (images: UploadedImage[]) => void
}

interface ImageItem {
  id: string
  url: string
  order: number
}

/**
 * Компонент множественной загрузки изображений
 *
 * @example
 * ```tsx
 * <BulkImageUpload
 *   title="Галерея товара"
 *   value={imageIds}
 *   onChange={setImageIds}
 *   maxImages={10}
 *   category="PRODUCT"
 * />
 * ```
 */
export function BulkImageUpload({
  value = [],
  onChange,
  maxImages,
  title,
  description,
  disabled = false,
  category = 'OTHER',
  uploadEndpoint = '/api/upload',
  imageEndpoint = '/api/images',
  colorPalette = 'blue',
  previewSize = 100,
  onUploadComplete,
}: BulkImageUploadProps) {
  const [images, setImages] = useState<ImageItem[]>([])

  // Синхронизация с value
  useEffect(() => {
    const newImages: ImageItem[] = value.map((id, index) => ({
      id,
      url: `${imageEndpoint}/${id}`,
      order: index + 1,
    }))
    setImages(newImages)
  }, [value, imageEndpoint])

  const { uploadMany, files, isUploading, clearFiles } = useImageUpload({
    uploadEndpoint,
    category,
    onUploadSuccess: (image) => {
      setImages((prev) => [
        ...prev,
        {
          id: image.id,
          url: image.url,
          order: prev.length + 1,
        },
      ])
    },
  })

  // Обновляем родительский стейт при изменении images
  useEffect(() => {
    const ids = images.map((img) => img.id)
    if (JSON.stringify(ids) !== JSON.stringify(value)) {
      onChange?.(ids)
    }
  }, [images, onChange, value])

  const handleFilesSelected = useCallback(
    async (fileList: FileList) => {
      // Проверка лимита
      if (maxImages) {
        const remainingSlots = maxImages - images.length
        if (remainingSlots <= 0) {
          return
        }

        const filesToUpload = Array.from(fileList).slice(0, remainingSlots)
        const result = await uploadMany(filesToUpload)
        onUploadComplete?.(result)
        clearFiles()
      } else {
        const result = await uploadMany(fileList)
        onUploadComplete?.(result)
        clearFiles()
      }
    },
    [maxImages, images.length, uploadMany, onUploadComplete, clearFiles]
  )

  const handleRemove = useCallback((id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id)
      // Пересчитываем порядок
      return filtered.map((img, idx) => ({ ...img, order: idx + 1 }))
    })
  }, [])

  const canUploadMore = !maxImages || images.length < maxImages
  const uploadingCount = files.filter((f) => f.status === 'uploading').length

  return (
    <Card.Root>
      {(title || description) && (
        <Card.Header pb={2}>
          <HStack justify="space-between">
            {title && (
              <Card.Title fontSize="md">
                {title}
                {images.length > 0 && (
                  <Text as="span" color="gray.500" fontWeight="normal" ml={2}>
                    ({images.length}
                    {maxImages && `/${maxImages}`})
                  </Text>
                )}
              </Card.Title>
            )}
          </HStack>
          {description && <Card.Description fontSize="sm">{description}</Card.Description>}
        </Card.Header>
      )}

      <Card.Body pt={title || description ? 0 : undefined}>
        <VStack gap={4} align="stretch">
          {/* Загруженные изображения */}
          {images.length > 0 && (
            <ImagePreviewGrid previewSize={previewSize}>
              {images.map((image) => (
                <ImagePreview
                  key={image.id}
                  src={image.url}
                  status="success"
                  order={image.order}
                  size={previewSize}
                  onRemove={disabled ? undefined : () => handleRemove(image.id)}
                  showRemoveButton={!disabled}
                />
              ))}

              {/* Загружающиеся файлы */}
              {files
                .filter((f) => f.status === 'uploading')
                .map((file) => (
                  <ImagePreview
                    key={file.localId}
                    src={file.previewUrl}
                    status="uploading"
                    size={previewSize}
                    showRemoveButton={false}
                  />
                ))}
            </ImagePreviewGrid>
          )}

          {/* Dropzone */}
          {canUploadMore && (
            <Dropzone
              onFilesSelected={handleFilesSelected}
              multiple
              disabled={disabled || isUploading}
              colorPalette={colorPalette}
            >
              {isUploading && uploadingCount > 0 && (
                <VStack gap={2} color={`${colorPalette}.600`}>
                  <Text fontWeight="medium">Загрузка... ({uploadingCount})</Text>
                </VStack>
              )}
            </Dropzone>
          )}

          {/* Сообщение о лимите */}
          {!canUploadMore && (
            <Box p={4} borderWidth="1px" borderRadius="md" borderColor="gray.200" textAlign="center">
              <Text color="gray.500" fontSize="sm">
                Достигнут лимит изображений ({maxImages})
              </Text>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
