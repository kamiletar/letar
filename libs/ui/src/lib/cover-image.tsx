'use client'

import { AspectRatio, Flex } from '@chakra-ui/react'
import NextImage from 'next/image'
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
  /**
   * Атрибут `sizes` для `next/image` при `fill` — какую долю вьюпорта реально занимает
   * изображение на каждом брейкпоинте. Без точного значения оптимизатор ориентируется на
   * дефолт (ширина вьюпорта) и может отдать более крупный вариант, чем нужно карточке/детали.
   */
  sizes?: string
  /**
   * Для единственного hero-изображения над сгибом (LCP-кандидат детальной страницы) — `loading`
   * тут недостаточно: `priority` у `next/image` дополнительно ставит `fetchpriority="high"` и
   * добавляет `<link rel="preload">`, из-за чего браузер начинает грузить файл раньше в общей
   * очереди сети. Не использовать на нескольких изображениях сразу (только один настоящий LCP).
   */
  priority?: boolean
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
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  priority = false,
}: CoverImageProps) {
  return (
    <AspectRatio ratio={ratio}>
      {imageUrl
        ? (
          <NextImage
            src={imageUrl}
            alt={alt}
            fill
            sizes={sizes}
            loading={priority ? undefined : loading}
            priority={priority}
            style={{ objectFit }}
          />
        )
        : (
          <Flex align="center" justify="center" bg={fallbackBg} color={fallbackColor}>
            {icon}
          </Flex>
        )}
    </AspectRatio>
  )
}
