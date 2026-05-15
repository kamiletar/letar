'use client'

import { Box, Button, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'

interface CartSummaryProps {
  items: Array<{
    id: string
    quantity: number
    productItem: {
      price: number
    }
  }>
}

/**
 * Итоговая информация по корзине с общей суммой.
 */
export function CartSummary({ items }: CartSummaryProps) {
  // Подсчет итоговой суммы
  const totalAmount = items.reduce((sum, item) => {
    return sum + Number(item.productItem.price) * item.quantity
  }, 0)

  // Общее количество товаров
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <Box borderWidth="1px" borderRadius="lg" p={6} h="fit-content" position="sticky" top={4}>
      <VStack align="stretch" gap={4}>
        <Text fontSize="xl" fontWeight="semibold">
          Итого
        </Text>

        <Separator />

        <HStack justify="space-between">
          <Text color="fg.muted">Товаров:</Text>
          <Text fontWeight="medium">
            {totalItems} {getItemsLabel(totalItems)}
          </Text>
        </HStack>

        <Separator />

        <HStack justify="space-between">
          <Text fontSize="lg" fontWeight="semibold">
            Общая сумма:
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="fg">
            {totalAmount.toLocaleString('ru-RU', {
              style: 'currency',
              currency: 'RUB',
            })}
          </Text>
        </HStack>

        <Button asChild colorPalette="fg" size="lg" width="100%">
          <NextLink href="/checkout">Оформить заказ</NextLink>
        </Button>

        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Оформите заказ и мы свяжемся с вами для подтверждения
        </Text>
      </VStack>
    </Box>
  )
}

/**
 * Возвращает правильное склонение слова "товар".
 */
function getItemsLabel(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'товаров'
  }

  if (lastDigit === 1) {
    return 'товар'
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'товара'
  }

  return 'товаров'
}
