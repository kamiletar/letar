'use client'

import { Avatar } from '@chakra-ui/react'
import { getImageProps } from 'next/image'
import { useMemo } from 'react'

type AvatarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

// Размеры аватаров в пикселях (Chakra UI)
const AVATAR_SIZES: Record<AvatarSize, number> = {
  '2xs': 16,
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
  '2xl': 128,
}

interface OptimizedAvatarProps {
  /** URL изображения */
  src?: string | null
  /** Имя пользователя (для fallback) */
  name?: string
  /** Размер аватара */
  size?: AvatarSize
}

/**
 * Оптимизированный аватар с использованием Next.js Image.
 * Автоматическая конвертация в WebP/AVIF, lazy loading, srcset.
 */
export function OptimizedAvatar({ src, name, size = 'md' }: OptimizedAvatarProps) {
  const pixelSize = AVATAR_SIZES[size]

  const imageProps = useMemo(() => {
    if (!src) {
      return null
    }
    const { props } = getImageProps({
      src,
      alt: name || 'Avatar',
      width: pixelSize,
      height: pixelSize,
    })
    // Берём только совместимые с Chakra Avatar.Image props
    return {
      src: props.src,
      srcSet: props.srcSet,
      alt: props.alt,
    }
  }, [src, name, pixelSize])

  return (
    <Avatar.Root size={size}>
      <Avatar.Fallback name={name} />
      {imageProps && <Avatar.Image {...imageProps} />}
    </Avatar.Root>
  )
}
