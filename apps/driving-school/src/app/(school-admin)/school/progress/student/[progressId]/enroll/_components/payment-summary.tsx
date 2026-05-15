'use client'

import { Card, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import { LuWallet } from 'react-icons/lu'

interface PaymentSummaryProps {
  totalCoursePrice: number
  totalInitialPayment: number
  totalOptionalsPrice: number
}

export function PaymentSummary({ totalCoursePrice, totalInitialPayment, totalOptionalsPrice }: PaymentSummaryProps) {
  const totalPrice = totalCoursePrice + totalOptionalsPrice
  const totalPaid = totalInitialPayment + totalOptionalsPrice // Опциональные оплачиваются сразу
  const remaining = totalPrice - totalPaid

  if (totalPrice === 0) {
    return null
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack gap={2}>
          <LuWallet size={20} />
          <Text fontWeight="semibold">Итого к оплате</Text>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack align="stretch" gap={3}>
          {totalCoursePrice > 0 && (
            <HStack justify="space-between">
              <Text color="fg.muted">Курсы обучения:</Text>
              <Text fontWeight="medium">{totalCoursePrice.toLocaleString('ru-RU')} ₽</Text>
            </HStack>
          )}

          {totalOptionalsPrice > 0 && (
            <HStack justify="space-between">
              <Text color="fg.muted">Дополнительные занятия:</Text>
              <Text fontWeight="medium">{totalOptionalsPrice.toLocaleString('ru-RU')} ₽</Text>
            </HStack>
          )}

          <Separator />

          <HStack justify="space-between">
            <Text fontWeight="semibold">Общая стоимость:</Text>
            <Text fontWeight="bold" fontSize="lg">
              {totalPrice.toLocaleString('ru-RU')} ₽
            </Text>
          </HStack>

          {totalInitialPayment > 0 && (
            <HStack justify="space-between">
              <Text color="fg.muted">Первоначальный взнос (курсы):</Text>
              <Text fontWeight="medium" color="green.600">
                -{totalInitialPayment.toLocaleString('ru-RU')} ₽
              </Text>
            </HStack>
          )}

          {totalOptionalsPrice > 0 && (
            <HStack justify="space-between">
              <Text color="fg.muted">Оплачено (доп. занятия):</Text>
              <Text fontWeight="medium" color="green.600">
                -{totalOptionalsPrice.toLocaleString('ru-RU')} ₽
              </Text>
            </HStack>
          )}

          <Separator />

          <HStack justify="space-between">
            <Text fontWeight="semibold">Остаток к оплате:</Text>
            <Text fontWeight="bold" fontSize="lg" color={remaining > 0 ? 'red.600' : 'green.600'}>
              {remaining.toLocaleString('ru-RU')} ₽
            </Text>
          </HStack>

          {remaining > 0 && (
            <Text fontSize="sm" color="fg.muted">
              Остаток можно оплатить в рассрочку в процессе обучения
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
