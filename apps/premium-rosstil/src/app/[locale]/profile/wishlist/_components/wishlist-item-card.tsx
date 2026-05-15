'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { WishlistPriority } from '@/generated/prisma'
import { Box, Card, Heading, IconButton, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import NextLink from 'next/link'
import { useState } from 'react'
import { FaTrash } from 'react-icons/fa'
import { removeFromWishlist } from '../_actions/remove-from-wishlist'
import { WishlistItemDetails } from './wishlist-item-details'

interface WishlistItemCardProps {
  item: {
    id: string
    note: string | null
    priority: WishlistPriority
    tags: string[]
    productVariant: {
      id: string
      color: string
      product: {
        id: string
        name: string
      }
      items: Array<{
        price: number
      }>
      images: Array<{
        url: string
        alt: string | null
      }>
    }
  }
}

/**
 * Карточка товара в избранном.
 * Отображает информацию о товаре и кнопку удаления.
 */
export function WishlistItemCard({ item }: WishlistItemCardProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const { productVariant } = item
  const firstImage = productVariant.images[0]

  // Вычисляем диапазон цен для данного варианта
  const prices = productVariant.items.map((i) => i.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isRemoving) {
      return
    }

    setIsRemoving(true)
    try {
      await removeFromWishlist(productVariant.id)
      toaster.success({
        title: 'Удалено из избранного',
        description: `${productVariant.product.name} (${productVariant.color})`,
      })
    } catch {
      toaster.error({
        title: 'Ошибка',
        description: 'Не удалось удалить товар из избранного',
      })
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <Card.Root data-testid="wishlist-item-card" overflow="hidden" position="relative">
      <NextLink href={`/catalog/${productVariant.product.id}`}>
        <Box position="relative" aspectRatio="3/4" overflow="hidden" bg="gray.100">
          {firstImage ? (
            <Image
              src={firstImage.url}
              alt={firstImage.alt || productVariant.product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
              <Text color="fg.muted">Нет изображения</Text>
            </Box>
          )}
        </Box>

        <Card.Body>
          <VStack align="start" gap={2}>
            <Heading size="md" textTransform="none" lineClamp={2}>
              {productVariant.product.name}
            </Heading>

            <Text fontSize="sm" color="fg.muted">
              Цвет: {productVariant.color}
            </Text>

            {prices.length > 0 && (
              <Text fontWeight="semibold" fontSize="lg" color="fg">
                {minPrice === maxPrice
                  ? minPrice.toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    })
                  : `${minPrice.toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    })} - ${maxPrice.toLocaleString('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    })}`}
              </Text>
            )}
          </VStack>
        </Card.Body>
      </NextLink>

      {/* Детали: приоритет, заметка, теги */}
      <Box px={4} pb={4}>
        <WishlistItemDetails itemId={item.id} note={item.note} priority={item.priority} tags={item.tags} />
      </Box>

      {/* Кнопка удаления (абсолютное позиционирование) */}
      <IconButton
        position="absolute"
        top={2}
        right={2}
        aria-label="Удалить из избранного"
        size="sm"
        colorPalette="red"
        variant="solid"
        onClick={handleRemove}
        loading={isRemoving}
        zIndex={10}
      >
        <FaTrash />
      </IconButton>
    </Card.Root>
  )
}
