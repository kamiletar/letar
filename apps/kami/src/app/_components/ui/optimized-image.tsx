'use client'

import { Box, type BoxProps } from '@chakra-ui/react'
import NextImage from 'next/image'
import { forwardRef, memo } from 'react'

interface OptimizedImageProps extends Omit<BoxProps, 'as'> {
  /** URL изображения */
  src: string
  /** Alt текст */
  alt: string
  /** Ширина для next/image (если не fill) */
  imgWidth?: number
  /** Высота для next/image (если не fill) */
  imgHeight?: number
  /** Приоритет загрузки (для LCP изображений) */
  priority?: boolean
  /** Качество изображения (1-100) */
  quality?: number
}

/**
 * Оптимизированное изображение на базе next/image
 *
 * Использует fill режим по умолчанию — контейнер задаёт размер,
 * изображение заполняет его с object-fit: cover.
 *
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/cover.jpg"
 *   alt="Обложка"
 *   boxSize="40px"
 *   borderRadius="md"
 * />
 * ```
 */
export const OptimizedImage = memo(
  forwardRef<HTMLDivElement, OptimizedImageProps>(function OptimizedImage(
    { src, alt, imgWidth, imgHeight, priority = false, quality = 75, ...boxProps },
    ref
  ) {
    // Если указаны imgWidth/imgHeight — не используем fill
    const useFill = !imgWidth && !imgHeight

    return (
      <Box ref={ref} position="relative" overflow="hidden" {...boxProps}>
        <NextImage
          src={src}
          alt={alt}
          fill={useFill}
          width={useFill ? undefined : imgWidth}
          height={useFill ? undefined : imgHeight}
          priority={priority}
          quality={quality}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          style={{ objectFit: 'cover' }}
        />
      </Box>
    )
  })
)
