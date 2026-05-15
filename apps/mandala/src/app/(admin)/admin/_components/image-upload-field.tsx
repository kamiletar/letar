'use client'

import { Box, Button, Field, Float, Icon, IconButton, Spinner, Text, VStack } from '@chakra-ui/react'
import NextImage from 'next/image'
import { useCallback, useState } from 'react'
import { LuImage, LuUpload, LuX } from 'react-icons/lu'
import { type ImageCategory, useImagePreview, useImageUpload } from '../_hooks'

interface ImageUploadFieldProps {
  /** Текущий Image ID */
  value: string
  /** Callback при изменении Image ID */
  onChange: (imageId: string) => void
  /** Лейбл поля */
  label: string
  /** Категория изображения для API */
  category?: ImageCategory
  /** Обязательное поле */
  required?: boolean
  /** Отключено */
  disabled?: boolean
  /** Подсказка */
  helperText?: string
  /** Ошибка */
  error?: string
}

/**
 * Компонент загрузки изображения с превью.
 * Хранит Image ID, отображает превью по URL.
 */
export function ImageUploadField({
  value,
  onChange,
  label,
  category = 'OTHER',
  required,
  disabled,
  helperText,
  error,
}: ImageUploadFieldProps) {
  // Локальное состояние для URL превью (обновляется при загрузке)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  // Загружаем URL для превью по Image ID (если локального нет)
  const { previewUrl: fetchedPreviewUrl, isLoading: isLoadingPreview } = useImagePreview({ value })
  const previewUrl = localPreviewUrl || fetchedPreviewUrl

  // Хук загрузки изображения
  const {
    isDragging,
    isUploading,
    error: uploadError,
    dragHandlers,
    handleFileSelect,
  } = useImageUpload({
    category,
    disabled,
    onSuccess: (result) => {
      onChange(result.id)
      setLocalPreviewUrl(result.url)
    },
  })

  const handleClear = useCallback(() => {
    onChange('')
    setLocalPreviewUrl(null)
  }, [onChange])

  const displayError = error || uploadError
  const hasPreview = previewUrl || isLoadingPreview

  return (
    <Field.Root invalid={!!displayError} required={required} disabled={disabled}>
      <Field.Label>
        {label}
        {required && (
          <Text as="span" color="red.500" ml={1}>
            *
          </Text>
        )}
      </Field.Label>

      {hasPreview ? (
        // Превью загруженного изображения
        <Box position="relative" w="100%" maxW="300px">
          {isLoadingPreview ? (
            <Box h="200px" borderRadius="md" bg="bg.muted" display="flex" alignItems="center" justifyContent="center">
              <Spinner size="lg" color="purple.500" />
            </Box>
          ) : (
            <Box position="relative" h="200px" w="100%" borderRadius="md" overflow="hidden" bg="black">
              <NextImage src={previewUrl ?? ''} alt={label} fill sizes="300px" style={{ objectFit: 'cover' }} />
            </Box>
          )}
          <Float placement="top-end" offset="4">
            <IconButton
              aria-label="Удалить"
              size="xs"
              colorPalette="red"
              variant="solid"
              rounded="full"
              onClick={handleClear}
              disabled={disabled || isUploading || isLoadingPreview}
            >
              <LuX />
            </IconButton>
          </Float>
        </Box>
      ) : (
        // Зона загрузки
        <Box
          p={6}
          borderWidth="2px"
          borderStyle="dashed"
          borderColor={isDragging ? 'purple.500' : displayError ? 'red.500' : 'gray.600'}
          borderRadius="lg"
          bg={isDragging ? 'purple.950' : 'bg.muted'}
          transition="all 0.2s"
          {...dragHandlers}
          cursor={disabled ? 'not-allowed' : 'pointer'}
          opacity={disabled ? 0.5 : 1}
          _hover={!disabled ? { borderColor: 'purple.400' } : undefined}
        >
          <VStack gap={3}>
            {isUploading ? (
              <>
                <Spinner size="lg" color="purple.500" />
                <Text fontSize="sm" color="fg.muted">
                  Загрузка...
                </Text>
              </>
            ) : (
              <>
                <Icon fontSize="2xl" color="fg.muted">
                  <LuImage />
                </Icon>
                <VStack gap={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    Перетащите изображение сюда
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    или
                  </Text>
                </VStack>
                <Button
                  as="label"
                  size="sm"
                  variant="outline"
                  colorPalette="purple"
                  cursor="pointer"
                  disabled={disabled}
                >
                  <LuUpload />
                  Выбрать файл
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={disabled}
                  />
                </Button>
                <Text fontSize="xs" color="fg.muted">
                  PNG, JPG, WEBP до 32MB
                </Text>
              </>
            )}
          </VStack>
        </Box>
      )}

      {helperText && !displayError && <Field.HelperText>{helperText}</Field.HelperText>}
      {displayError && <Field.ErrorText>{displayError}</Field.ErrorText>}
    </Field.Root>
  )
}
