'use client'

import { Box, Skeleton, Text } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import NextImage from 'next/image'

/** Динамическая загрузка Swiper (экономит ~40KB при одном изображении) */
const ProductSliderSwiper = dynamic(() => import('./product-slider-swiper').then((m) => m.ProductSliderSwiper), {
  ssr: false,
  loading: () => <Skeleton aspectRatio={1} borderRadius="lg" />,
})

/** Изображение товара с URL для отображения */
interface ProductImageWithUrl {
  id: string
  url: string
  alt: string | null
}

interface ProductSliderProps {
  images: ProductImageWithUrl[]
  productName: string
}

/**
 * Слайдер/изображение товара с оптимизированной загрузкой
 */
export function ProductSlider({ images, productName }: ProductSliderProps) {
  // Нет изображений — показываем placeholder
  if (images.length === 0) {
    return (
      <Box bg="gray.800" aspectRatio={1} display="flex" alignItems="center" justifyContent="center" borderRadius="lg">
        <Text color="gray.600">Нет изображений</Text>
      </Box>
    )
  }

  // Одно изображение — показываем без слайдера (Swiper не грузится!)
  if (images.length === 1) {
    return (
      <Box borderRadius="lg" overflow="hidden" position="relative" aspectRatio={1}>
        <NextImage
          src={images[0].url}
          alt={images[0].alt || productName}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: 'cover' }}
          priority
        />
      </Box>
    )
  }

  // Несколько изображений — ленивая загрузка Swiper
  return <ProductSliderSwiper images={images} productName={productName} />
}
