'use client'

import type { BoxProps } from '@chakra-ui/react'
import { Box, Card, HStack, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Dropzone } from './dropzone'
import { ImagePreview, ImagePreviewGrid, type RenderImageArgs } from './image-preview'
import { createEndpointUrlResolver, DEFAULT_IMAGE_ENDPOINT } from './image-url'
import type { ImageCategory, UploadedImage } from './types'
import { useImageUpload } from './use-image-upload'

export interface BulkImageUploadProps {
  /**
   * Текущие изображения (массив ID либо готовых ссылок)
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
   * Как превратить сохранённое значение в ссылку.
   *
   * По умолчанию — шаблон `<imageEndpoint>/<value>`. Асинхронные резолверы
   * здесь не поддерживаются: сетка рисует ссылки синхронно.
   */
  resolveImageUrl?: (value: string) => string | null
  /**
   * Своя отрисовка картинки (например, `next/image`)
   */
  renderImage?: (args: RenderImageArgs) => React.ReactNode
  /**
   * Цветовая схема
   * @default 'blue'
   */
  colorPalette?: BoxProps['colorPalette']
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
  imageEndpoint = DEFAULT_IMAGE_ENDPOINT,
  resolveImageUrl,
  renderImage,
  colorPalette = 'blue',
  previewSize = 100,
  onUploadComplete,
}: BulkImageUploadProps) {
  const [images, setImages] = useState<ImageItem[]>([])

  const resolveUrl = useMemo(() => {
    if (resolveImageUrl) {
      return resolveImageUrl
    }
    const resolver = createEndpointUrlResolver(imageEndpoint)
    return (item: string) => resolver(item) as string | null
  }, [resolveImageUrl, imageEndpoint])

  // Синхронизация с value
  useEffect(() => {
    const newImages: ImageItem[] = value.map((id, index) => ({
      id,
      url: resolveUrl(id) ?? '',
      order: index + 1,
    }))
    setImages(newImages)
  }, [value, resolveUrl])

  const { uploadMany, files, isUploading, clearFiles } = useImageUpload({
    uploadEndpoint,
    imageEndpoint,
    category,
    multiple: true,
    disabled,
    onUploadSuccess: (image) => {
      setImages((prev) => [
        ...prev,
        {
          id: image.id || image.url,
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
    [maxImages, images.length, uploadMany, onUploadComplete, clearFiles],
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
                  <Text color="fg.muted" fontWeight="normal" ml={2} asChild>
                    <span>
                      ({images.length}
                      {maxImages && `/${maxImages}`})
                    </span>
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
                  renderImage={renderImage}
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
                <VStack gap={2} colorPalette={colorPalette} color="colorPalette.fg">
                  <Text fontWeight="medium">Загрузка... ({uploadingCount})</Text>
                </VStack>
              )}
            </Dropzone>
          )}

          {/* Сообщение о лимите */}
          {!canUploadMore && (
            <Box p={4} borderWidth="1px" borderRadius="md" borderColor="border" textAlign="center">
              <Text color="fg.muted" fontSize="sm">
                Достигнут лимит изображений ({maxImages})
              </Text>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
