'use client'

import { AspectRatio, Flex, Image } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface CoverImageProps {
  /** URL изображения. `null`/пусто — рендерится `icon`-фолбэк вместо `Image` */
  imageUrl: string | null
  /** Alt текст изображения */
  alt: string
  /** Иконка-фолбэк, показывается вместо изображения при пустом `imageUrl` */
  icon: ReactNode
  /** Соотношение сторон обёртки */
  ratio?: number
  /** Фон фолбэк-блока (по умолчанию без фона — прозрачный) */
  fallbackBg?: string
  /** Цвет иконки фолбэка */
  fallbackColor?: string
  objectFit?: 'cover' | 'contain'
  loading?: 'lazy' | 'eager'
}

/**
 * Клиентская граница для AspectRatio + Image/фолбэк-иконка.
 *
 * AspectRatio/Image/Flex в Chakra UI v3 помечены `'use client'` — при пересечении
 * границы Server→Client Component React Flight заворачивает единственного child
 * в массив, а `Children.only` внутри AspectRatio на это падает
 * (`apps/domwellbes/PLAN_COMPLETED.md`, «React.Children.only на /materials», 2026-08-11).
 * Компонент сам объявляет `'use client'`, поэтому серверный родитель может
 * рендерить его напрямую без собственной клиентской границы.
 */
export function CoverImage({
  imageUrl,
  alt,
  icon,
  ratio = 4 / 3,
  fallbackBg,
  fallbackColor = 'brand.fg',
  objectFit = 'cover',
  loading = 'lazy',
}: CoverImageProps) {
  return (
    <AspectRatio ratio={ratio}>
      {imageUrl
        ? <Image src={imageUrl} alt={alt} objectFit={objectFit} loading={loading} />
        : (
          <Flex align="center" justify="center" bg={fallbackBg} color={fallbackColor}>
            {icon}
          </Flex>
        )}
    </AspectRatio>
  )
}
