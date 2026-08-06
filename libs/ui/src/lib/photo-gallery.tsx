'use client'

import { Box, SimpleGrid, Skeleton } from '@chakra-ui/react'
import Image from 'next/image'
import { Suspense, useState } from 'react'

import { LightboxViewer } from './lightbox-viewer'

export interface PhotoItem {
  /** Raw URL: /api/files/... или любой публичный URL */
  src: string
  alt?: string
}

interface PhotoGalleryProps {
  photos: PhotoItem[]
  /** Количество колонок по брейкпоинтам */
  columns?: { base?: number; sm?: number; md?: number; lg?: number }
  gap?: number
  /** Соотношение сторон карточки (default: 4/3) */
  aspectRatio?: number
  /** Максимальная ширина для /_next/image в лайтбоксе (default: 1920) */
  lightboxMaxWidth?: number
  /**
   * Качество в лайтбоксе (default: 85).
   *
   * ⚠️ Next.js 16 по умолчанию разрешает через `/_next/image` только `quality: 75` — без
   * `images.qualities: [75, 85]` в `next.config` потребителя лайтбокс будет получать 400 при
   * открытии фото (превью на дефолтных 75 при этом продолжат грузиться нормально).
   */
  lightboxQuality?: number
  /** Скелетоны при loading=true */
  skeletonCount?: number
  /** Показывать скелетоны подгрузки в конце сетки */
  loading?: boolean
}

function nextImageUrl(src: string, w: number, q: number) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`
}

export function PhotoGallery({
  photos,
  columns = { base: 2, sm: 3, md: 4 },
  gap = 3,
  aspectRatio = 4 / 3,
  lightboxMaxWidth = 1920,
  lightboxQuality = 85,
  skeletonCount = 4,
  loading = false,
}: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1)

  const slides = photos.map((p) => ({
    src: nextImageUrl(p.src, lightboxMaxWidth, lightboxQuality),
    alt: p.alt,
  }))

  return (
    <>
      <SimpleGrid columns={columns} gap={gap}>
        {photos.map((photo, i) => (
          <Box
            key={`${photo.src}-${i}`}
            position="relative"
            aspectRatio={aspectRatio}
            borderRadius="lg"
            overflow="hidden"
            cursor="pointer"
            role="button"
            tabIndex={0}
            aria-label={photo.alt ?? `Фото ${i + 1}`}
            onClick={() => {
              setLightboxIndex(i)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setLightboxIndex(i)
              }
            }}
            _hover={{ opacity: 0.9 }}
            _focusVisible={{ outline: '2px solid', outlineColor: 'brand.500', outlineOffset: '2px' }}
            transition="opacity 0.15s"
          >
            <Image
              src={photo.src}
              alt={photo.alt ?? ''}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
              loading={i < 12 ? 'eager' : 'lazy'}
            />
          </Box>
        ))}
        {loading
          && Array.from({ length: skeletonCount }).map((_, i) => (
            <Skeleton key={`sk-${i}`} aspectRatio={aspectRatio} borderRadius="lg" />
          ))}
      </SimpleGrid>

      {lightboxIndex >= 0 && (
        <Suspense fallback={null}>
          <LightboxViewer
            open={true}
            index={lightboxIndex}
            close={() => {
              setLightboxIndex(-1)
            }}
            slides={slides}
          />
        </Suspense>
      )}
    </>
  )
}
