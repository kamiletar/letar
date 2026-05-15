'use client'

import { Box, Grid, IconButton, Spinner } from '@chakra-ui/react'
import { LightboxViewer } from '@letar/ui'
import Image from 'next/image'
import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa'

const imageSizes = [16, 32, 48, 64, 96, 128, 256, 384]
const deviceSizes = [640, 750, 828, 1080, 1200, 1920, 2048, 2700, 3200, 3700, 3840]

function nextImageUrl(src: string, size: number) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${size}&q=90`
}
interface ImageGalleryProps {
  images: Array<{
    id: string
    url: string
    alt: string
    order: number
    width: number
    height: number
  }>
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const [mainImageIndex, setMainImageIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Ref для отслеживания начала touch (избегаем ре-рендеров)
  const touchStartX = useRef<number | null>(null)

  const goToPrevious = useCallback(() => {
    setIsLoading(true)
    setMainImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }, [images.length])

  const goToNext = useCallback(() => {
    setIsLoading(true)
    setMainImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }, [images.length])

  // Touch handlers для swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX.current === null) {
        return
      }

      const touchEndX = e.changedTouches[0].clientX
      const diff = touchStartX.current - touchEndX
      const SWIPE_THRESHOLD = 50 // Минимальное расстояние для регистрации swipe

      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        if (diff > 0) {
          // Свайп влево → следующее изображение
          goToNext()
        } else {
          // Свайп вправо → предыдущее изображение
          goToPrevious()
        }
      }

      touchStartX.current = null
    },
    [goToNext, goToPrevious]
  )

  // Вычисляем слайды для лайтбокса (до условного return для соблюдения rules of hooks)
  const slides = useMemo(() => {
    return images.map(({ url, width, height, alt }) => ({
      alt,
      width,
      height,
      src: nextImageUrl(url, width),
      srcSet: [...imageSizes, ...deviceSizes]
        .filter((size) => size <= width)
        .map((size) => ({
          src: nextImageUrl(url, size),
          width: size,
          height: Math.round((height / width) * size),
        })),
    }))
  }, [images])

  if (images.length === 0) {
    return null
  }

  const hasMultipleImages = images.length > 1
  return (
    <Box>
      {/* Main image */}
      <Box
        position="relative"
        aspectRatio="3/4"
        borderRadius="lg"
        overflow="hidden"
        bg="gray.100"
        cursor="pointer"
        role="button"
        tabIndex={0}
        aria-label="Открыть фото в полном размере"
        onClick={() => setLightboxIndex(mainImageIndex)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setLightboxIndex(mainImageIndex)
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        transition="transform 0.2s"
        _hover={{ transform: 'scale(1.02)' }}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'fg',
          outlineOffset: '2px',
        }}
      >
        {/* Индикатор загрузки */}
        {isLoading && (
          <Box
            position="absolute"
            inset={0}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bg="gray.100"
            zIndex={1}
          >
            <Spinner size="lg" color="fg" />
          </Box>
        )}

        <Image
          src={images[mainImageIndex].url}
          alt={images[mainImageIndex].alt || ''}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: 'cover' }}
          priority
          onLoad={() => setIsLoading(false)}
        />

        {/* Стрелки навигации */}
        {hasMultipleImages && (
          <>
            <IconButton
              aria-label="Предыдущее фото"
              position="absolute"
              left={2}
              top="50%"
              transform="translateY(-50%)"
              zIndex={2}
              size="lg"
              variant="solid"
              colorPalette="blackAlpha"
              bg="blackAlpha.600"
              color="white"
              _hover={{ bg: 'blackAlpha.800' }}
              onClick={(e) => {
                e.stopPropagation()
                goToPrevious()
              }}
            >
              <FaChevronLeft />
            </IconButton>
            <IconButton
              aria-label="Следующее фото"
              position="absolute"
              right={2}
              top="50%"
              transform="translateY(-50%)"
              zIndex={2}
              size="lg"
              variant="solid"
              colorPalette="blackAlpha"
              bg="blackAlpha.600"
              color="white"
              _hover={{ bg: 'blackAlpha.800' }}
              onClick={(e) => {
                e.stopPropagation()
                goToNext()
              }}
            >
              <FaChevronRight />
            </IconButton>
          </>
        )}
      </Box>

      {/* Thumbnail grid - only show if more than one image */}
      {hasMultipleImages && (
        <Grid templateColumns="repeat(auto-fill, minmax(80px, 1fr))" gap={2} mt={4}>
          {images.map((image, index) => (
            <Box
              key={image.id}
              position="relative"
              aspectRatio="3/4"
              borderRadius="md"
              overflow="hidden"
              bg="gray.100"
              cursor="pointer"
              role="button"
              tabIndex={0}
              aria-label={`Фото ${index + 1} из ${images.length}`}
              aria-pressed={mainImageIndex === index}
              onClick={() => {
                if (index !== mainImageIndex) {
                  setIsLoading(true)
                  setMainImageIndex(index)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  if (index !== mainImageIndex) {
                    setIsLoading(true)
                    setMainImageIndex(index)
                  }
                }
              }}
              borderWidth={mainImageIndex === index ? '2px' : '1px'}
              borderColor={mainImageIndex === index ? 'fg' : 'border'}
              transition="all 0.2s"
              _hover={{
                borderColor: 'fg',
                transform: 'scale(1.05)',
              }}
              _focusVisible={{
                outline: '2px solid',
                outlineColor: 'fg',
                outlineOffset: '2px',
              }}
            >
              <Image src={image.url} alt={image.alt || ''} fill sizes="80px" style={{ objectFit: 'cover' }} />
            </Box>
          ))}
        </Grid>
      )}

      {/* Lightbox загружается только когда открывается */}
      {lightboxIndex >= 0 && (
        <Suspense fallback={null}>
          <LightboxViewer open={true} index={lightboxIndex} close={() => setLightboxIndex(-1)} slides={slides} />
        </Suspense>
      )}
    </Box>
  )
}
