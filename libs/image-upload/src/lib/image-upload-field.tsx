'use client'

import { Box, Field, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { Dropzone } from './dropzone'
import { ImagePreview } from './image-preview'
import type { ImageCategory } from './use-image-upload'
import { useImageUpload } from './use-image-upload'

export interface ImageUploadFieldProps {
  /**
   * Текущее значение (ID изображения)
   */
  value?: string | null
  /**
   * Callback при изменении значения
   */
  onChange?: (imageId: string | null) => void
  /**
   * Название поля
   */
  label?: string
  /**
   * Вспомогательный текст
   */
  helperText?: string
  /**
   * Текст ошибки
   */
  error?: string
  /**
   * Обязательное поле
   */
  required?: boolean
  /**
   * Отключить поле
   */
  disabled?: boolean
  /**
   * Категория изображения
   * @default 'OTHER'
   */
  category?: ImageCategory
  /**
   * Endpoint для загрузки
   * @default '/api/upload'
   */
  uploadEndpoint?: string
  /**
   * Endpoint для получения превью
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
   * @default 150
   */
  previewSize?: number
}

/**
 * Компонент поля загрузки одного изображения
 *
 * @example
 * ```tsx
 * <ImageUploadField
 *   label="Аватар"
 *   value={avatarId}
 *   onChange={setAvatarId}
 *   category="AVATAR"
 *   required
 * />
 * ```
 */
export function ImageUploadField({
  value,
  onChange,
  label,
  helperText,
  error,
  required = false,
  disabled = false,
  category = 'OTHER',
  uploadEndpoint = '/api/upload',
  imageEndpoint = '/api/images',
  colorPalette = 'blue',
  previewSize = 150,
}: ImageUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const { upload, isUploading } = useImageUpload({
    uploadEndpoint,
    category,
    onUploadSuccess: (image) => {
      onChange?.(image.id)
      setPreviewUrl(image.url)
    },
    onUploadError: (err) => {
      console.error('Upload error:', err)
    },
  })

  // Загружаем превью при изменении value
  useEffect(() => {
    if (value) {
      setIsLoadingPreview(true)
      setPreviewUrl(`${imageEndpoint}/${value}`)
      setIsLoadingPreview(false)
    } else {
      setPreviewUrl(null)
    }
  }, [value, imageEndpoint])

  const handleFilesSelected = useCallback(
    (files: FileList) => {
      const file = files[0]
      if (file) {
        upload(file)
      }
    },
    [upload]
  )

  const handleRemove = useCallback(() => {
    onChange?.(null)
    setPreviewUrl(null)
  }, [onChange])

  const hasImage = !!value && !!previewUrl
  const isLoading = isUploading || isLoadingPreview
  const isInvalid = !!error

  return (
    <Field.Root required={required} invalid={isInvalid} disabled={disabled}>
      {label && <Field.Label>{label}</Field.Label>}

      <Box>
        {hasImage ? (
          <ImagePreview
            src={previewUrl}
            size={previewSize}
            status={isLoading ? 'uploading' : 'success'}
            onRemove={disabled ? undefined : handleRemove}
            showRemoveButton={!disabled}
          />
        ) : (
          <Dropzone
            onFilesSelected={handleFilesSelected}
            disabled={disabled || isLoading}
            colorPalette={colorPalette}
            minH={`${previewSize}px`}
          >
            {isLoading ? (
              <VStack gap={2}>
                <Spinner size="lg" color={`${colorPalette}.500`} />
                <Text fontSize="sm" color="gray.500">
                  Загрузка...
                </Text>
              </VStack>
            ) : undefined}
          </Dropzone>
        )}
      </Box>

      {helperText && !isInvalid && <Field.HelperText>{helperText}</Field.HelperText>}

      {isInvalid && <Field.ErrorText>{error}</Field.ErrorText>}
    </Field.Root>
  )
}
