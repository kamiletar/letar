'use client'

import type { OrderStatus } from '@/generated/prisma'
import { Card, Link as ChakraLink, HStack, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { OrderStatusBadge } from './order-status-badge'

interface OrderCardProps {
  order: {
    orderNumber: string
    status: OrderStatus
    totalAmount: number | string
    createdAt: Date | string
    itemsCount: number
  }
}

/**
 * Карточка заказа для отображения в списке.
 * Показывает основную информацию и ссылку на детальный просмотр.
 */
export function OrderCard({ order }: OrderCardProps) {
  const createdDate = new Date(order.createdAt)
  // Конвертируем в число для правильного форматирования (работает с number, string, Decimal)
  const totalAmount = Number(order.totalAmount)

  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Заголовок с номером заказа и датой */}
          <HStack justify="space-between" align="start">
            <VStack align="start" gap={1}>
              <ChakraLink asChild fontWeight="semibold" fontSize="lg">
                <NextLink href={`/profile/orders/${order.orderNumber}`}>Заказ {order.orderNumber}</NextLink>
              </ChakraLink>
              <Text fontSize="sm" color="fg.muted">
                {createdDate.toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </VStack>

            <OrderStatusBadge status={order.status} />
          </HStack>

          {/* Информация о заказе */}
          <HStack justify="space-between" pt={2} borderTopWidth="1px">
            <VStack align="start" gap={1}>
              <Text fontSize="sm" color="fg.muted">
                Товаров:
              </Text>
              <Text fontWeight="medium">
                {order.itemsCount} {getItemsLabel(order.itemsCount)}
              </Text>
            </VStack>

            <VStack align="end" gap={1}>
              <Text fontSize="sm" color="fg.muted">
                Сумма:
              </Text>
              <Text fontSize="xl" fontWeight="bold" color="fg">
                {totalAmount.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                })}
              </Text>
            </VStack>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
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
