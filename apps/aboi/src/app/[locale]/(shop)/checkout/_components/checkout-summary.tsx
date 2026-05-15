'use client'

import type { CartView } from '@/lib/cart'
import { Box, Flex, Spinner, Stack, Text } from '@chakra-ui/react'

interface CheckoutSummaryProps {
  cart: CartView
  shippingCostKopecks: number
  isCalcShipping: boolean
  postalCode?: string
}

export function CheckoutSummary({ cart, shippingCostKopecks, isCalcShipping, postalCode }: CheckoutSummaryProps) {
  const total = cart.itemsTotal + shippingCostKopecks

  return (
    <Stack gap={4} p={5} bg="bg.subtle" borderRadius="xl">
      <Text fontWeight="semibold" fontSize="lg">
        Ваш заказ
      </Text>

      <Stack gap={3}>
        {cart.items.map((line) => (
          <Flex key={line.id} justify="space-between" gap={3} fontSize="sm">
            <Box>
              <Text fontWeight="medium">{line.productName}</Text>
              <Text color="fg.muted">
                {line.lengthMeters.toFixed(1)} м × {(line.unitPrice / 100).toFixed(0)} ₽
              </Text>
            </Box>
            <Text fontWeight="semibold" whiteSpace="nowrap">
              {(line.total / 100).toFixed(0)} ₽
            </Text>
          </Flex>
        ))}
      </Stack>

      <Box borderTopWidth="1px" borderColor="border" pt={3}>
        <Flex justify="space-between" fontSize="sm" color="fg.muted">
          <Text>Доставка</Text>
          {isCalcShipping ? (
            <Spinner size="xs" />
          ) : shippingCostKopecks > 0 ? (
            <Text>{(shippingCostKopecks / 100).toFixed(0)} ₽</Text>
          ) : (postalCode?.length ?? 0) >= 6 ? (
            <Text color="fg.muted">уточнит менеджер</Text>
          ) : (
            <Text color="fg.muted">введите индекс</Text>
          )}
        </Flex>
      </Box>

      <Box borderTopWidth="1px" borderColor="border" pt={3}>
        <Flex justify="space-between" align="end">
          <Text fontSize="sm" color="fg.muted">
            Итого
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {(total / 100).toFixed(0)} ₽
          </Text>
        </Flex>
      </Box>
    </Stack>
  )
}
