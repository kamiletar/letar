'use client'

import type { BoxProps } from '@chakra-ui/react'
import { Box, Float, IconButton, Spinner } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { LuCheck, LuCircleAlert, LuX } from 'react-icons/lu'
import type { UploadStatus } from './types'

/** Параметры, передаваемые в {@link ImagePreviewProps.renderImage}. */
export interface RenderImageArgs {
  /** Ссылка на изображение */
  src: string
  /** Alt текст */
  alt: string
}

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
  /**
   * Своя отрисовка картинки вместо обычного `<img>`.
   *
   * Нужна приложениям на Next.js, чтобы подставить `next/image` с его
   * оптимизацией. Библиотека намеренно не зависит от `next` сама.
   *
   * @example
   * ```tsx
   * renderImage={({ src, alt }) => (
   *   <NextImage src={src} alt={alt} fill sizes="150px" style={{ objectFit: 'cover' }} />
   * )}
   * ```
   */
  renderImage?: (args: RenderImageArgs) => ReactNode
}

/**
 * Компонент превью изображения с индикатором статуса
 *
 * @example
 * ```tsx
 * <ImagePreview
 *   src="/api/files/products/1.jpg"
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
  renderImage,
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
      borderColor={status === 'error' ? 'border.error' : status === 'success' ? 'green.emphasized' : 'border'}
      {...boxProps}
    >
      {/* Изображение */}
      {renderImage
        ? (
          renderImage({ src, alt })
        )
        : (
          // Библиотека не зависит от next — приложениям на Next.js для
          // подстановки `next/image` служит проп renderImage
          // oxlint-disable-next-line no-img-element
          <img
            src={src}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

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
          color="red.fg"
        >
          <LuCircleAlert size={24} />
        </Box>
      )}

      {status === 'success' && (
        <Float placement="bottom-end" offset="4">
          <Box bg="green.solid" color="green.contrast" borderRadius="full" p={0.5} lineHeight={0}>
            <LuCheck size={12} />
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
