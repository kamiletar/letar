'use client'

import type { BoxProps } from '@chakra-ui/react'
import { Box, Field, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { Dropzone } from './dropzone'
import { ImagePreview, type ImagePreviewProps, type RenderImageArgs } from './image-preview'
import type { ImageCategory, ImageUrlResolver, UploadedImage } from './types'
import { useImagePreviewUrl } from './use-image-preview-url'
import { useImageUpload } from './use-image-upload'

/** Пропсы превью, которыми поле управляет само. */
type ManagedPreviewProps = 'src' | 'status' | 'onRemove' | 'showRemoveButton' | 'renderImage'

export interface ImageUploadFieldProps {
  /**
   * Текущее значение: ID изображения либо готовая ссылка
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
   * Текст ошибки извне (например, от валидации формы)
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
   * Как превратить `value` в ссылку для показа.
   *
   * По умолчанию — шаблон `<imageEndpoint>/<value>`. Если эндпоинт отдаёт
   * JSON с описанием, а не байты картинки, передайте
   * `createMetadataUrlResolver()`.
   */
  resolveImageUrl?: ImageUrlResolver
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
   * Размер превью и минимальная высота зоны загрузки
   * @default 150
   */
  previewSize?: number
  /**
   * Дополнительные пропсы превью — например, чтобы сделать его
   * прямоугольным вместо квадратного
   */
  previewProps?: Omit<ImagePreviewProps, ManagedPreviewProps>
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
  imageEndpoint,
  resolveImageUrl,
  renderImage,
  colorPalette = 'blue',
  previewSize = 150,
  previewProps,
}: ImageUploadFieldProps) {
  // Ссылка, которую сервер вернул при загрузке. Резолвер её не перезапрашивает:
  // лишний round-trip, а если он не отработает — превью не появится вовсе,
  // хотя файл уже лежит на сервере. Держим вместе со значением, которому она
  // соответствует, чтобы не показать её после смены value извне.
  const [justUploaded, setJustUploaded] = useState<UploadedImage | null>(null)

  const {
    upload,
    isUploading,
    error: uploadError,
    clearError,
  } = useImageUpload({
    uploadEndpoint,
    imageEndpoint,
    category,
    disabled,
    onUploadSuccess: (image) => {
      setJustUploaded(image)
      onChange?.(image.id || image.url)
    },
  })

  const { previewUrl: resolvedUrl, isLoading: isLoadingPreview } = useImagePreviewUrl({
    value,
    resolveImageUrl,
    imageEndpoint,
  })

  // Ссылка из ответа годится, только пока value указывает на этот же файл
  const isJustUploadedValue = !!justUploaded && !!value && (value === justUploaded.id || value === justUploaded.url)
  const previewUrl = isJustUploadedValue ? justUploaded.url : resolvedUrl

  const handleFilesSelected = useCallback(
    (files: FileList) => {
      const file = files[0]
      if (file) {
        upload(file)
      }
    },
    [upload],
  )

  const handleRemove = useCallback(() => {
    clearError()
    setJustUploaded(null)
    onChange?.(null)
  }, [onChange, clearError])

  const isLoading = isUploading || isLoadingPreview
  const displayError = error || uploadError
  const isInvalid = !!displayError
  // Пока превью разрешается, показываем плашку превью, а не зону загрузки —
  // иначе при открытии формы с уже выбранной картинкой мигает dropzone
  const hasImage = !!value && (!!previewUrl || isLoadingPreview)

  return (
    <Field.Root required={required} invalid={isInvalid} disabled={disabled}>
      {label && (
        <Field.Label>
          {label}
          <Field.RequiredIndicator />
        </Field.Label>
      )}

      <Box>
        {hasImage
          ? (
            <ImagePreview
              src={previewUrl ?? ''}
              // Осмысленный alt важнее дефолтного «Image preview»
              alt={label ?? 'Image preview'}
              size={previewSize}
              status={isLoading ? 'uploading' : 'success'}
              onRemove={disabled ? undefined : handleRemove}
              showRemoveButton={!disabled}
              renderImage={previewUrl ? renderImage : undefined}
              {...previewProps}
            />
          )
          : (
            <Dropzone
              onFilesSelected={handleFilesSelected}
              disabled={disabled || isLoading}
              colorPalette={colorPalette}
              minH={`${previewSize}px`}
            >
              {isLoading
                ? (
                  <VStack gap={2} colorPalette={colorPalette}>
                    <Spinner size="lg" color="colorPalette.solid" />
                    <Text fontSize="sm" color="fg.muted">
                      Загрузка...
                    </Text>
                  </VStack>
                )
                : undefined}
            </Dropzone>
          )}
      </Box>

      {helperText && !isInvalid && <Field.HelperText>{helperText}</Field.HelperText>}

      {isInvalid && <Field.ErrorText>{displayError}</Field.ErrorText>}
    </Field.Root>
  )
}
