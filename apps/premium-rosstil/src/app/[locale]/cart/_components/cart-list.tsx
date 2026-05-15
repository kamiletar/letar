'use client'

import { VStack } from '@chakra-ui/react'
import { CartItemCard } from './cart-item-card'

interface CartListProps {
  items: Array<{
    id: string
    quantity: number
    productItem: {
      id: string
      price: number
      size: {
        id: string
        international: string
        ru: string
      }
      variant: {
        id: string
        color: string
        composition: string
        product: {
          id: string
          name: string
          gender: string
        }
        images: Array<{
          id: string
          url: string
          alt: string | null
        }>
      }
    }
  }>
}

/**
 * Список товаров в корзине.
 */
export function CartList({ items }: CartListProps) {
  return (
    <VStack align="stretch" gap={4}>
      {items.map((item) => (
        <CartItemCard key={item.id} item={item} />
      ))}
    </VStack>
  )
}
