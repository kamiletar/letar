'use client'

import { Link as LocalizedLink } from '@/i18n/navigation'
import { Badge, Box, Flex, Heading, Link, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import NextImage from 'next/image'
import { memo } from 'react'

/** Изображение товара с URL */
interface ProductImageWithUrl {
  id: string
  url: string
  alt: string | null
}

/** Товар с URL изображений */
interface ProductWithUrls {
  id: string
  slug: string
  name: string
  description: string
  price: number
  inStock: boolean
  images: ProductImageWithUrl[]
}

interface ProductCardProps {
  product: ProductWithUrls
}

/**
 * Карточка товара в магазине.
 * Мемоизирована для предотвращения ререндеров при обновлении списка товаров.
 */
export const ProductCard = memo(function ProductCard({ product }: ProductCardProps) {
  const t = useTranslations('shop')
  const firstImage = product.images[0]

  return (
    <Link asChild>
      <LocalizedLink href={`/shop/${product.slug}`}>
        <Box
          borderRadius="lg"
          overflow="hidden"
          bg="bg.panel"
          transition="all 0.3s ease"
          _hover={{
            transform: 'translateY(-4px)',
            boxShadow: '0 0 20px rgba(202, 158, 103, 0.4)',
          }}
        >
          {/* Изображение */}
          <Box position="relative" aspectRatio={1}>
            {firstImage ? (
              <NextImage
                src={firstImage.url}
                alt={firstImage.alt || product.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                style={{ objectFit: 'cover' }}
                loading="lazy"
              />
            ) : (
              <Box
                bg={{ _light: 'gray.200', _dark: 'gray.800' }}
                width="100%"
                height="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="fg.muted">{t('noImage')}</Text>
              </Box>
            )}

            {!product.inStock && (
              <Badge
                position="absolute"
                top={4}
                right={4}
                colorPalette="red"
                size="lg"
                bg="red.600"
                color="white"
                px={3}
                py={1}
              >
                {t('outOfStock')}
              </Badge>
            )}
          </Box>

          {/* Информация */}
          <Box p={4}>
            <Heading as="h3" size="md" color="fg" mb={2} lineClamp={2}>
              {product.name}
            </Heading>

            {product.description && (
              <Text fontSize="sm" color="fg.muted" mb={3} lineClamp={2}>
                {product.description}
              </Text>
            )}

            <Flex justify="space-between" align="center">
              <Text fontSize="xl" fontWeight="bold" color="fg">
                {product.price.toLocaleString('ru-RU')} ₽
              </Text>

              {product.inStock && (
                <Badge colorPalette="green" size="sm" bg="green.700" color="white">
                  {t('inStock')}
                </Badge>
              )}
            </Flex>
          </Box>
        </Box>
      </LocalizedLink>
    </Link>
  )
})
