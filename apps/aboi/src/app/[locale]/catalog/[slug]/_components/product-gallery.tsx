'use client'

import { Box, SimpleGrid } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface GalleryImage {
  path: string
  alt: string | null
}

interface Props {
  images: GalleryImage[]
  productName: string
}

export function ProductGallery({ images, productName }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const active = images[activeIndex]

  // Закрытие лайтбокса по Escape
  useEffect(() => {
    if (!lightboxOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowRight') setActiveIndex((i) => Math.min(i + 1, images.length - 1))
      if (e.key === 'ArrowLeft') setActiveIndex((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxOpen, images.length])

  if (images.length === 0) {
    return <Box w="full" aspectRatio="4/5" bg="bg.muted" borderRadius="xl" />
  }

  return (
    <>
      <Box>
        {/* Главное фото */}
        <Box
          cursor="zoom-in"
          borderRadius="xl"
          overflow="hidden"
          onClick={() => setLightboxOpen(true)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/${active!.path}`}
            alt={active!.alt ?? productName}
            style={{ width: '100%', aspectRatio: '4/5', objectFit: 'cover', display: 'block' }}
          />
        </Box>

        {/* Миниатюры */}
        {images.length > 1 && (
          <SimpleGrid columns={4} gap={2} mt={3}>
            {images.map((img, i) => (
              <Box
                key={img.path}
                cursor="pointer"
                borderRadius="lg"
                overflow="hidden"
                outline={i === activeIndex ? '2px solid' : '2px solid transparent'}
                outlineColor={i === activeIndex ? 'brand.solid' : 'transparent'}
                opacity={i === activeIndex ? 1 : 0.6}
                _hover={{ opacity: 1 }}
                transition="all 0.15s"
                onClick={() => setActiveIndex(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${img.path}`}
                  alt={img.alt ?? productName}
                  style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }}
                />
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>

      {/* Лайтбокс */}
      {lightboxOpen && (
        <Box
          position="fixed"
          inset={0}
          zIndex="modal"
          bg="blackAlpha.900"
          display="flex"
          alignItems="center"
          justifyContent="center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Стрелка влево */}
          {activeIndex > 0 && (
            <Box
              position="absolute"
              left={4}
              top="50%"
              transform="translateY(-50%)"
              color="white"
              fontSize="3xl"
              cursor="pointer"
              px={3}
              py={2}
              borderRadius="md"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => i - 1) }}
            >
              ‹
            </Box>
          )}

          {/* Фото */}
          <Box
            maxW="90vw"
            maxH="90vh"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/${active!.path}`}
              alt={active!.alt ?? productName}
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }}
            />
          </Box>

          {/* Стрелка вправо */}
          {activeIndex < images.length - 1 && (
            <Box
              position="absolute"
              right={4}
              top="50%"
              transform="translateY(-50%)"
              color="white"
              fontSize="3xl"
              cursor="pointer"
              px={3}
              py={2}
              borderRadius="md"
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={(e) => { e.stopPropagation(); setActiveIndex((i) => i + 1) }}
            >
              ›
            </Box>
          )}

          {/* Счётчик */}
          <Box
            position="absolute"
            bottom={6}
            left="50%"
            transform="translateX(-50%)"
            color="whiteAlpha.700"
            fontSize="sm"
          >
            {activeIndex + 1} / {images.length}
          </Box>

          {/* Крестик */}
          <Box
            position="absolute"
            top={4}
            right={4}
            color="white"
            fontSize="2xl"
            cursor="pointer"
            px={2}
            py={1}
            borderRadius="md"
            _hover={{ bg: 'whiteAlpha.200' }}
            onClick={() => setLightboxOpen(false)}
          >
            ✕
          </Box>
        </Box>
      )}
    </>
  )
}
