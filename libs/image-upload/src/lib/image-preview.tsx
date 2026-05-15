'use client'

import type { BoxProps } from '@chakra-ui/react'
import { Box, Float, IconButton, Spinner } from '@chakra-ui/react'
import { LuCheck, LuCircleAlert, LuX } from 'react-icons/lu'
import type { UploadStatus } from './use-image-upload'

export interface ImagePreviewProps extends Omit<BoxProps, 'children'> {
  /**
   * URL изображения для превью
   */
  src: string
  /**
   * Alt текст
   */
  alt?: string
  /**
   * Статус загрузки
   */
  status?: UploadStatus
  /**
   * Callback при удалении
   */
  onRemove?: () => void
  /**
   * Показывать кнопку удаления
   * @default true
   */
  showRemoveButton?: boolean
  /**
   * Порядковый номер (для отображения badge)
   */
  order?: number
  /**
   * Размер превью
   * @default 100
   */
  size?: number | string
}

/**
 * Компонент превью изображения с индикатором статуса
 *
 * @example
 * ```tsx
 * <ImagePreview
 *   src="/api/images/123"
 *   status="success"
 *   onRemove={() => handleRemove('123')}
 *   order={1}
 * />
 * ```
 */
export function ImagePreview({
  src,
  alt = 'Image preview',
  status,
  onRemove,
  showRemoveButton = true,
  order,
  size = 100,
  ...boxProps
}: ImagePreviewProps) {
  const sizeValue = typeof size === 'number' ? `${size}px` : size

  return (
    <Box
      position="relative"
      width={sizeValue}
      height={sizeValue}
      borderRadius="md"
      overflow="hidden"
      borderWidth="2px"
      borderColor={status === 'error' ? 'red.300' : status === 'success' ? 'green.300' : 'gray.200'}
      {...boxProps}
    >
      {/* Изображение */}
      <img
        src={src}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Оверлей статуса */}
      {status === 'uploading' && (
        <Box
          position="absolute"
          inset={0}
          bg="blackAlpha.500"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner size="sm" color="white" />
        </Box>
      )}

      {status === 'error' && (
        <Box
          position="absolute"
          inset={0}
          bg="blackAlpha.600"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Box as={LuCircleAlert} boxSize={6} color="red.300" />
        </Box>
      )}

      {status === 'success' && (
        <Float placement="bottom-end" offset="4">
          <Box bg="green.500" color="white" borderRadius="full" p={0.5}>
            <Box as={LuCheck} boxSize={3} />
          </Box>
        </Float>
      )}

      {/* Номер порядка */}
      {order !== undefined && (
        <Float placement="bottom-start" offset="4">
          <Box bg="blackAlpha.700" color="white" px={1.5} py={0.5} borderRadius="sm" fontSize="xs" fontWeight="bold">
            #{order}
          </Box>
        </Float>
      )}

      {/* Кнопка удаления */}
      {showRemoveButton && onRemove && (
        <Float placement="top-end" offset="4">
          <IconButton
            aria-label="Удалить"
            size="2xs"
            colorPalette="red"
            variant="solid"
            borderRadius="full"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <LuX />
          </IconButton>
        </Float>
      )}
    </Box>
  )
}

export interface ImagePreviewGridProps extends BoxProps {
  /**
   * Размер превью
   * @default 100
   */
  previewSize?: number
}

/**
 * Grid контейнер для превью изображений
 */
export function ImagePreviewGrid({ children, previewSize = 100, ...boxProps }: ImagePreviewGridProps) {
  return (
    <Box display="grid" gridTemplateColumns={`repeat(auto-fill, minmax(${previewSize}px, 1fr))`} gap={3} {...boxProps}>
      {children}
    </Box>
  )
}
