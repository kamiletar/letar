'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { CompareItem } from '@/hooks/use-compare'
import { useCompare } from '@/hooks/use-compare'
import { Link } from '@/i18n/navigation'
import {
  Badge,
  Box,
  Button,
  Container,
  EmptyState,
  Heading,
  HStack,
  Icon,
  IconButton,
  Image,
  Input,
  Table,
  Tag,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { useState } from 'react'
import { FaArrowLeft, FaBalanceScale, FaCheck, FaMinus, FaPlus, FaShoppingCart, FaTimes, FaTrash } from 'react-icons/fa'

/**
 * Характеристики для сравнения
 */
interface CompareFeature {
  label: string
  getValue: (item: CompareItem) => string | number | React.ReactNode
  highlight?: 'min' | 'max' // Выделить лучшее значение
}

const features: CompareFeature[] = [
  {
    label: 'Цена',
    getValue: (item) => `${item.price.toLocaleString('ru-RU')} ₽`,
    highlight: 'min',
  },
  {
    label: 'Цвет',
    getValue: (item) => item.variantColor,
  },
  {
    label: 'Состав',
    getValue: (item) => item.composition,
  },
  {
    label: 'Размеры',
    getValue: (item) => item.sizes.join(', ') || 'Нет в наличии',
    highlight: 'max', // Больше размеров = лучше
  },
]

export default function ComparePage() {
  const { items, removeFromCompare, clearCompare, addPro, addCon, removePro, removeCon, isLoading } = useCompare()
  const [newPro, setNewPro] = useState<Record<string, string>>({})
  const [newCon, setNewCon] = useState<Record<string, string>>({})

  const handleAddPro = async (variantId: string) => {
    const text = newPro[variantId]?.trim()
    if (!text) {
      return
    }
    await addPro(variantId, text)
    setNewPro((prev) => ({ ...prev, [variantId]: '' }))
    toaster.success({ title: 'Плюс добавлен' })
  }

  const handleAddCon = async (variantId: string) => {
    const text = newCon[variantId]?.trim()
    if (!text) {
      return
    }
    await addCon(variantId, text)
    setNewCon((prev) => ({ ...prev, [variantId]: '' }))
    toaster.success({ title: 'Минус добавлен' })
  }

  // Определяем лучшие значения для подсветки
  const getBestValue = (feature: CompareFeature) => {
    if (!feature.highlight || items.length < 2) {
      return null
    }

    const values = items.map((item) => {
      const _val = feature.getValue(item)
      if (feature.label === 'Цена') {
        return item.price
      }
      if (feature.label === 'Размеры') {
        return item.sizes.length
      }
      return 0
    })

    if (feature.highlight === 'min') {
      const minValue = Math.min(...values)
      return items.filter((_, i) => values[i] === minValue).map((i) => i.variantId)
    } else {
      const maxValue = Math.max(...values)
      return items.filter((_, i) => values[i] === maxValue).map((i) => i.variantId)
    }
  }

  if (isLoading) {
    return (
      <Container maxW="6xl" py={8}>
        <Text>Загрузка...</Text>
      </Container>
    )
  }

  if (items.length === 0) {
    return (
      <Container maxW="6xl" py={8}>
        <EmptyState.Root>
          <EmptyState.Content>
            <EmptyState.Indicator>
              <Icon as={FaBalanceScale} />
            </EmptyState.Indicator>
            <EmptyState.Title>Нет товаров для сравнения</EmptyState.Title>
            <EmptyState.Description>
              Добавьте товары в сравнение, чтобы сравнить их характеристики
            </EmptyState.Description>
          </EmptyState.Content>
          <Button asChild colorPalette="fg">
            <Link href="/catalog">
              <Icon as={FaArrowLeft} mr={2} />
              Перейти в каталог
            </Link>
          </Button>
        </EmptyState.Root>
      </Container>
    )
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <HStack gap={4}>
            <Button asChild variant="ghost" size="sm">
              <Link href="/catalog">
                <Icon as={FaArrowLeft} mr={2} />В каталог
              </Link>
            </Button>
            <Heading size="xl">
              Сравнение товаров
              <Badge ml={3} colorPalette="fg" size="lg">
                {items.length}
              </Badge>
            </Heading>
          </HStack>
          <Button variant="outline" colorPalette="red" size="sm" onClick={clearCompare}>
            <Icon as={FaTrash} mr={2} />
            Очистить
          </Button>
        </HStack>

        {/* Таблица сравнения */}
        <Box overflowX="auto" borderWidth="1px" borderColor="border.muted" borderRadius="lg">
          <Table.Root variant="outline" size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader w="150px" bg="bg.subtle">
                  Характеристика
                </Table.ColumnHeader>
                {items.map((item) => (
                  <Table.ColumnHeader key={item.variantId} textAlign="center" bg="bg.subtle" minW="200px">
                    <VStack gap={2}>
                      {/* Изображение */}
                      <Box position="relative">
                        <Box
                          w={24}
                          h={24}
                          borderRadius="md"
                          overflow="hidden"
                          borderWidth="1px"
                          borderColor="border.muted"
                          mx="auto"
                        >
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt={item.productName} w="full" h="full" objectFit="cover" />
                          ) : (
                            <Box
                              w="full"
                              h="full"
                              bg="bg.muted"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Icon as={FaBalanceScale} color="fg.muted" />
                            </Box>
                          )}
                        </Box>
                        {/* Кнопка удаления */}
                        <Tooltip content="Удалить из сравнения">
                          <IconButton
                            aria-label="Удалить"
                            position="absolute"
                            top={-1}
                            right={-1}
                            size="2xs"
                            variant="solid"
                            colorPalette="red"
                            borderRadius="full"
                            onClick={() => removeFromCompare(item.variantId)}
                          >
                            <Icon as={FaTimes} boxSize={2} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      {/* Название */}
                      <Text fontSize="sm" fontWeight="medium" lineClamp={2}>
                        {item.productName}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {item.variantColor}
                      </Text>
                    </VStack>
                  </Table.ColumnHeader>
                ))}
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {/* Характеристики */}
              {features.map((feature) => {
                const bestIds = getBestValue(feature)
                return (
                  <Table.Row key={feature.label}>
                    <Table.Cell fontWeight="medium" bg="bg.subtle">
                      {feature.label}
                    </Table.Cell>
                    {items.map((item) => {
                      const isBest = bestIds?.includes(item.variantId)
                      return (
                        <Table.Cell key={item.variantId} textAlign="center" bg={isBest ? 'green.subtle' : undefined}>
                          <HStack gap={1} justify="center">
                            {isBest && <Icon as={FaCheck} color="green.500" boxSize={3} />}
                            <Text fontSize="sm">{feature.getValue(item)}</Text>
                          </HStack>
                        </Table.Cell>
                      )
                    })}
                  </Table.Row>
                )
              })}

              {/* Плюсы */}
              <Table.Row>
                <Table.Cell fontWeight="medium" bg="green.subtle" color="green.700">
                  <HStack gap={1}>
                    <Icon as={FaPlus} boxSize={3} />
                    <Text>Плюсы</Text>
                  </HStack>
                </Table.Cell>
                {items.map((item) => (
                  <Table.Cell key={item.variantId} verticalAlign="top">
                    <VStack gap={2} align="stretch">
                      {/* Список плюсов */}
                      {item.notes?.pros.map((pro, proIndex) => (
                        <Tag.Root key={`${item.variantId}-pro-${pro}`} size="sm" colorPalette="green" variant="subtle">
                          <Tag.Label>{pro}</Tag.Label>
                          <Tag.EndElement>
                            <Tag.CloseTrigger onClick={() => removePro(item.variantId, proIndex)} />
                          </Tag.EndElement>
                        </Tag.Root>
                      ))}
                      {/* Добавить плюс */}
                      <HStack gap={1}>
                        <Input
                          size="xs"
                          placeholder="Добавить плюс..."
                          value={newPro[item.variantId] || ''}
                          onChange={(e) => setNewPro((prev) => ({ ...prev, [item.variantId]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddPro(item.variantId)
                            }
                          }}
                        />
                        <IconButton
                          aria-label="Добавить"
                          size="xs"
                          colorPalette="green"
                          onClick={() => handleAddPro(item.variantId)}
                        >
                          <Icon as={FaPlus} boxSize={2} />
                        </IconButton>
                      </HStack>
                    </VStack>
                  </Table.Cell>
                ))}
              </Table.Row>

              {/* Минусы */}
              <Table.Row>
                <Table.Cell fontWeight="medium" bg="red.subtle" color="red.700">
                  <HStack gap={1}>
                    <Icon as={FaMinus} boxSize={3} />
                    <Text>Минусы</Text>
                  </HStack>
                </Table.Cell>
                {items.map((item) => (
                  <Table.Cell key={item.variantId} verticalAlign="top">
                    <VStack gap={2} align="stretch">
                      {/* Список минусов */}
                      {item.notes?.cons.map((con, conIndex) => (
                        <Tag.Root key={`${item.variantId}-con-${con}`} size="sm" colorPalette="red" variant="subtle">
                          <Tag.Label>{con}</Tag.Label>
                          <Tag.EndElement>
                            <Tag.CloseTrigger onClick={() => removeCon(item.variantId, conIndex)} />
                          </Tag.EndElement>
                        </Tag.Root>
                      ))}
                      {/* Добавить минус */}
                      <HStack gap={1}>
                        <Input
                          size="xs"
                          placeholder="Добавить минус..."
                          value={newCon[item.variantId] || ''}
                          onChange={(e) => setNewCon((prev) => ({ ...prev, [item.variantId]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAddCon(item.variantId)
                            }
                          }}
                        />
                        <IconButton
                          aria-label="Добавить"
                          size="xs"
                          colorPalette="red"
                          onClick={() => handleAddCon(item.variantId)}
                        >
                          <Icon as={FaMinus} boxSize={2} />
                        </IconButton>
                      </HStack>
                    </VStack>
                  </Table.Cell>
                ))}
              </Table.Row>

              {/* Действия */}
              <Table.Row>
                <Table.Cell bg="bg.subtle" />
                {items.map((item) => (
                  <Table.Cell key={item.variantId} textAlign="center">
                    <VStack gap={2}>
                      <Button asChild colorPalette="fg" size="sm" w="full">
                        <Link href={`/catalog/${item.productId}`}>
                          <Icon as={FaShoppingCart} mr={2} />
                          Перейти к товару
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        colorPalette="red"
                        size="xs"
                        onClick={() => removeFromCompare(item.variantId)}
                      >
                        <Icon as={FaTimes} mr={1} />
                        Удалить
                      </Button>
                    </VStack>
                  </Table.Cell>
                ))}
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Box>

        {/* Подсказка */}
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Добавьте плюсы и минусы для каждого товара, чтобы облегчить выбор
        </Text>
      </VStack>
    </Container>
  )
}
