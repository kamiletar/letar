'use client'

import { Box, Button, Collapsible, Field, HStack, Icon, Input, Slider, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { FaCalculator, FaChevronDown, FaChevronUp, FaCoffee } from 'react-icons/fa'

// Подсказки по категориям - среднее количество носок
const WEAR_ESTIMATES: Record<string, { wears: number; years: number; description: string }> = {
  'Базовая футболка': { wears: 100, years: 2, description: '~1 раз в неделю' },
  'Базовая рубашка': { wears: 80, years: 3, description: '~2 раза в месяц' },
  Джинсы: { wears: 150, years: 3, description: '~1 раз в неделю' },
  'Вечернее платье': { wears: 10, years: 5, description: '~2 раза в год' },
  'Коктейльное платье': { wears: 20, years: 4, description: '~5 раз в год' },
  'Повседневное платье': { wears: 60, years: 2, description: '~2 раза в месяц' },
  Пальто: { wears: 120, years: 5, description: '~4 месяца в году' },
  Куртка: { wears: 100, years: 4, description: '~3-4 месяца в году' },
  Блуза: { wears: 50, years: 2, description: '~2 раза в месяц' },
  Юбка: { wears: 40, years: 3, description: '~1 раз в месяц' },
  Брюки: { wears: 80, years: 3, description: '~2 раза в месяц' },
}

// Сравнения для наглядности
const COMPARISONS = [
  { amount: 150, text: 'латте в кофейне' },
  { amount: 300, text: 'бизнес-ланч' },
  { amount: 500, text: 'поход в кино' },
  { amount: 1000, text: 'такси по городу' },
  { amount: 2000, text: 'ужин в ресторане' },
]

interface CostPerWearProps {
  price: number
  category?: string
}

/**
 * Калькулятор стоимости за носку (Cost per Wear).
 * Помогает оценить реальную стоимость вещи с учётом частоты использования.
 */
export function CostPerWear({ price, category }: CostPerWearProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Получаем оценку из категории или используем default
  const estimate = category ? WEAR_ESTIMATES[category] : null
  const defaultWears = estimate?.wears || 50

  const [estimatedWears, setEstimatedWears] = useState(defaultWears)

  // Расчёт стоимости за носку
  const costPerWear = estimatedWears > 0 ? price / estimatedWears : 0

  // Находим подходящее сравнение
  const comparison = COMPARISONS.find((c) => costPerWear <= c.amount) || COMPARISONS[COMPARISONS.length - 1]

  // Оценка: хорошая/средняя/высокая стоимость за носку
  const getValueRating = () => {
    if (costPerWear < 200) {
      return { text: 'Отличная стоимость за носку!', color: 'green.500' }
    }
    if (costPerWear < 500) {
      return { text: 'Хорошее соотношение цена/качество', color: 'blue.500' }
    }
    if (costPerWear < 1000) {
      return { text: 'Средняя стоимость за носку', color: 'orange.500' }
    }
    return { text: 'Высокая стоимость за носку', color: 'red.500' }
  }

  const rating = getValueRating()

  return (
    <Collapsible.Root open={isOpen} onOpenChange={(e) => setIsOpen(e.open)}>
      <Collapsible.Trigger asChild>
        <Button variant="ghost" size="sm" width="full" justifyContent="space-between">
          <HStack gap={2}>
            <Icon as={FaCalculator} />
            <Text>Стоимость за носку</Text>
          </HStack>
          <Icon as={isOpen ? FaChevronUp : FaChevronDown} />
        </Button>
      </Collapsible.Trigger>

      <Collapsible.Content>
        <Box p={4} borderWidth="1px" borderRadius="md" mt={2}>
          <VStack align="stretch" gap={4}>
            {/* Цена товара */}
            <HStack justify="space-between">
              <Text fontSize="sm" color="fg.muted">
                Цена товара:
              </Text>
              <Text fontWeight="bold">
                {price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 })}
              </Text>
            </HStack>

            {/* Слайдер количества носок */}
            <Field.Root>
              <Field.Label fontSize="sm">Сколько раз планируете надеть?</Field.Label>
              <Slider.Root
                value={[estimatedWears]}
                onValueChange={(e) => setEstimatedWears(e.value[0])}
                min={1}
                max={200}
                step={1}
              >
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumbs>
                    <Slider.Thumb index={0} />
                  </Slider.Thumbs>
                </Slider.Control>
              </Slider.Root>
              <HStack justify="space-between" mt={1}>
                <Input
                  type="number"
                  value={estimatedWears}
                  onChange={(e) => setEstimatedWears(Math.max(1, parseInt(e.target.value) || 1))}
                  size="sm"
                  width="80px"
                  min={1}
                />
                <Text fontSize="xs" color="fg.muted">
                  раз
                </Text>
              </HStack>
              {estimate && (
                <Field.HelperText>
                  Для категории «{category}»: в среднем ~{estimate.wears} раз ({estimate.description})
                </Field.HelperText>
              )}
            </Field.Root>

            {/* Результат */}
            <Box p={3} bg="bg.muted" borderRadius="md">
              <VStack gap={2}>
                <Text fontSize="2xl" fontWeight="bold" color={rating.color}>
                  {costPerWear.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    minimumFractionDigits: 0,
                  })}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  за одну носку
                </Text>
                <Text fontSize="sm" fontWeight="medium" color={rating.color}>
                  {rating.text}
                </Text>
              </VStack>
            </Box>

            {/* Сравнение */}
            <HStack gap={2} justify="center">
              <Icon as={FaCoffee} color="fg.muted" />
              <Text fontSize="sm" color="fg.muted">
                Это как {Math.ceil(costPerWear / comparison.amount)} {comparison.text}
              </Text>
            </HStack>

            {/* Подсказки по категориям */}
            {!category && (
              <Box>
                <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={2}>
                  Подсказки по количеству носок:
                </Text>
                <VStack align="stretch" gap={1}>
                  {Object.entries(WEAR_ESTIMATES)
                    .slice(0, 5)
                    .map(([cat, est]) => (
                      <HStack key={cat} justify="space-between" fontSize="xs">
                        <Text color="fg.muted">{cat}</Text>
                        <Button size="xs" variant="ghost" onClick={() => setEstimatedWears(est.wears)}>
                          ~{est.wears} раз
                        </Button>
                      </HStack>
                    ))}
                </VStack>
              </Box>
            )}
          </VStack>
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
