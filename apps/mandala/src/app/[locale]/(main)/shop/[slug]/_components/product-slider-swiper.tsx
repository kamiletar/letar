'use client'

import { Box } from '@chakra-ui/react'
import NextImage from 'next/image'
import { Navigation, Pagination } from 'swiper/modules'
import { Swiper, SwiperSlide } from 'swiper/react'

// oxlint-disable-next-line import/no-unassigned-import -- CSS imports for Swiper
import 'swiper/css'
// oxlint-disable-next-line import/no-unassigned-import
import 'swiper/css/navigation'
// oxlint-disable-next-line import/no-unassigned-import
import 'swiper/css/pagination'

/** Изображение товара с URL для отображения */
interface ProductImageWithUrl {
  id: string
  url: string
  alt: string | null
}

interface ProductSliderSwiperProps {
  images: ProductImageWithUrl[]
  productName: string
}

/**
 * Swiper-слайдер для товара (тяжёлый компонент, загружается динамически)
 */
export function ProductSliderSwiper({ images, productName }: ProductSliderSwiperProps) {
  return (
    <Box
      borderRadius="lg"
      overflow="hidden"
      css={{
        '& .swiper': {
          borderRadius: 'var(--chakra-radii-lg)',
        },
        '& .swiper-button-next, & .swiper-button-prev': {
          color: 'var(--chakra-colors-fg)',
          '&::after': {
            fontSize: '32px',
          },
        },
        '& .swiper-pagination-bullet': {
          background: 'var(--chakra-colors-gray-600)',
        },
        '& .swiper-pagination-bullet-active': {
          background: 'var(--chakra-colors-fg)',
        },
      }}
    >
      <Swiper modules={[Navigation, Pagination]} navigation pagination={{ clickable: true }} loop={images.length > 1}>
        {images.map((image, index) => (
          <SwiperSlide key={image.id}>
            <Box position="relative" aspectRatio={1}>
              <NextImage
                src={image.url}
                alt={image.alt || productName}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: 'cover' }}
                preload={index === 0}
                fetchPriority={index === 0 ? 'high' : undefined}
                loading={index === 0 ? 'eager' : 'lazy'}
              />
            </Box>
          </SwiperSlide>
        ))}
      </Swiper>
    </Box>
  )
}
