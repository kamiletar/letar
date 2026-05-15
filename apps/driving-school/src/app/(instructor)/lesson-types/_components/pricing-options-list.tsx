'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { vehicleOwnerLabels } from '@/driving-school-form/labels'
import { Badge, Box, Button, Card, HStack, SimpleGrid, Stack, Text, VStack } from '@chakra-ui/react'
import { useTransition } from 'react'
import { LuStar, LuTrash2 } from 'react-icons/lu'
import type { PricingOptionSummary } from '../_actions/lesson-type.action'
import { deletePricingOption, setPrimaryPricingOption } from '../_actions/lesson-type.action'

interface PricingOptionsListProps {
  lessonTypeId: string
  pricingOptions: PricingOptionSummary[]
}

// Форматирование цены
function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(price)
}

// Вычисление итоговой стоимости курса
function calculateTotalPrice(option: PricingOptionSummary): number {
  const total = option.pricePerLesson * option.lessonsCount
  const discount = total * (option.discountPercent / 100)
  return total - discount
}

export function PricingOptionsList({ lessonTypeId: _lessonTypeId, pricingOptions }: PricingOptionsListProps) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deletePricingOption(id)
      if (result.success) {
        toaster.success({ title: 'Вариант цены удалён' })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  const handleSetPrimary = (id: string) => {
    startTransition(async () => {
      const result = await setPrimaryPricingOption(id)
      if (result.success) {
        toaster.success({ title: 'Основной вариант изменён' })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  if (pricingOptions.length === 0) {
    return null
  }

  // Группируем по vehicleOwner
  const groupedByOwner = pricingOptions.reduce(
    (acc, option) => {
      const key = option.vehicleOwner
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(option)
      return acc
    },
    {} as Record<string, PricingOptionSummary[]>
  )

  return (
    <VStack gap={6} align="stretch">
      {Object.entries(groupedByOwner).map(([owner, options]) => (
        <Box key={owner}>
          <Text fontWeight="semibold" mb={3} color="fg.muted">
            {vehicleOwnerLabels[owner as keyof typeof vehicleOwnerLabels] ?? owner}
          </Text>

          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {options.map((option) => (
              <Card.Root
                key={option.id}
                borderColor={option.isPrimary ? 'brand.500' : undefined}
                borderWidth={option.isPrimary ? '2px' : '1px'}
              >
                <Card.Body>
                  <VStack align="stretch" gap={3}>
                    {/* Заголовок с бейджами */}
                    <HStack justify="space-between" flexWrap="wrap" gap={2}>
                      <HStack gap={2}>
                        {option.isPrimary && (
                          <Badge colorPalette="brand" size="sm">
                            <LuStar size={12} />
                            Основной
                          </Badge>
                        )}
                        {option.lessonsCount > 1 && (
                          <Badge colorPalette="purple" size="sm">
                            Курс {option.lessonsCount} занятий
                          </Badge>
                        )}
                        {option.discountPercent > 0 && (
                          <Badge colorPalette="green" size="sm">
                            -{option.discountPercent}%
                          </Badge>
                        )}
                      </HStack>
                    </HStack>

                    {/* Цена */}
                    <Box>
                      <Text fontSize="2xl" fontWeight="bold">
                        {formatPrice(option.pricePerLesson)}
                        <Text as="span" fontSize="md" fontWeight="normal" color="fg.muted">
                          {' '}
                          / занятие
                        </Text>
                      </Text>

                      {option.lessonsCount > 1 && (
                        <Text fontSize="sm" color="fg.muted" mt={1}>
                          Итого за курс: {formatPrice(calculateTotalPrice(option))}
                          {option.discountPercent > 0 && (
                            <Text as="span" textDecoration="line-through" ml={2}>
                              {formatPrice(option.pricePerLesson * option.lessonsCount)}
                            </Text>
                          )}
                        </Text>
                      )}
                    </Box>

                    {/* Действия */}
                    <Stack direction="row" gap={2} pt={2}>
                      {!option.isPrimary && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetPrimary(option.id)}
                          disabled={isPending}
                        >
                          <LuStar />
                          Сделать основным
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={() => handleDelete(option.id)}
                        disabled={isPending}
                      >
                        <LuTrash2 />
                        Удалить
                      </Button>
                    </Stack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </VStack>
  )
}
