'use client'

/** Миниатюра обложки: фото с телефона или копия с сайта, работает без интернета */

import { Box, Image } from '@chakra-ui/react'

import { useCoverUrl } from '../_hooks/use-cover-url'

interface CoverThumbProps {
  blobKey: string | null
  path: string | null
  /** Сторона квадрата, px; не задана — картинка во всю ширину с пропорциями 4:3 */
  size?: number
}

export function CoverThumb({ blobKey, path, size }: CoverThumbProps) {
  const url = useCoverUrl(blobKey, path)
  if (!blobKey && !path) {
    return null
  }

  return (
    <Box
      flexShrink={0}
      w={size ? `${size}px` : '100%'}
      h={size ? `${size}px` : undefined}
      aspectRatio={size ? undefined : 4 / 3}
      borderRadius="lg"
      overflow="hidden"
      bg="bg.muted"
    >
      {url && <Image src={url} alt="" w="100%" h="100%" objectFit="cover" />}
    </Box>
  )
}
