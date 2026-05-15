'use client'

import type { LoyaltyLevel } from '@/generated/prisma'
import { LOYALTY_LEVEL_COLORS, LOYALTY_LEVEL_LABELS, maxPointsForOrder } from '@/lib/loyalty'
import { Badge, Box, HStack, Input, Slider, Text, VStack } from '@chakra-ui/react'
import { useTypedFormContext } from '@letar/forms'
import { useState } from 'react'
import { FaGem } from 'react-icons/fa'
import type { CheckoutFormData } from '../_schemas/checkout-form.schema'

interface LoyaltyPointsInputProps {
  balance: number
  level: LoyaltyLevel
  subtotal: number
}

/** Виджет для использования баллов лояльности при оформлении заказа */
export function LoyaltyPointsInput({ balance, level, subtotal }: LoyaltyPointsInputProps) {
  const { setFieldValue } = useTypedFormContext<CheckoutFormData>()
  const maxPoints = maxPointsForOrder(subtotal, balance)
  const [points, setPoints] = useState(0)

  if (balance <= 0) {
    return null
  }

  const handleChange = (value: number) => {
    const clamped = Math.min(value, maxPoints)
    setPoints(clamped)
    setFieldValue('loyaltyPoints', clamped)
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4}>
      <VStack align="stretch" gap={3}>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Box color={`${LOYALTY_LEVEL_COLORS[level]}.500`}>
              <FaGem />
            </Box>
            <Text fontWeight="semibold">Бонусные баллы</Text>
            <Badge colorPalette={LOYALTY_LEVEL_COLORS[level]} size="sm">
              {LOYALTY_LEVEL_LABELS[level]}
            </Badge>
          </HStack>
          <Text fontSize="sm" color="fg.muted">
            Доступно: {balance.toLocaleString('ru-RU')}
          </Text>
        </HStack>

        {maxPoints > 0 && (
          <>
            <Slider.Root
              min={0}
              max={maxPoints}
              step={1}
              value={[points]}
              onValueChange={(details) => handleChange(details.value[0])}
            >
              <Slider.Control>
                <Slider.Track>
                  <Slider.Range />
                </Slider.Track>
                <Slider.Thumb index={0} />
              </Slider.Control>
            </Slider.Root>

            <HStack justify="space-between">
              <Input
                type="number"
                value={points}
                onChange={(e) => handleChange(Number(e.target.value) || 0)}
                min={0}
                max={maxPoints}
                size="sm"
                w="120px"
              />
              <Text fontSize="sm" color="fg.muted">
                Скидка: {points > 0 ? `-${points.toLocaleString('ru-RU')} ₽` : '0 ₽'}
              </Text>
            </HStack>

            <Text fontSize="xs" color="fg.muted">
              Можно списать до {maxPoints.toLocaleString('ru-RU')} баллов (до 50% от суммы заказа)
            </Text>
          </>
        )}

        {maxPoints === 0 && (
          <Text fontSize="sm" color="fg.muted">
            Минимальная сумма для использования баллов не достигнута
          </Text>
        )}
      </VStack>
    </Box>
  )
}
