'use client'

import { useOfflineMeasurements } from '@/hooks/use-offline-measurements'
import { Link } from '@/i18n/navigation'
import { Badge, Box, HStack, Icon, Table, Text, VStack } from '@chakra-ui/react'
import { FaCheck, FaRuler } from 'react-icons/fa'

interface SizeChartRow {
  size: string
  bust?: number
  waist?: number
  hips?: number
}

interface SizeComparisonProps {
  sizeChart: SizeChartRow[]
}

/**
 * Компонент для сравнения мерок пользователя с размерной сеткой товара.
 * Показывает, какой размер лучше всего подходит на основе сохранённых мерок.
 */
export function SizeComparison({ sizeChart }: SizeComparisonProps) {
  const { measurements, compareWithSizeChart, hasMeasurements, isLoading } = useOfflineMeasurements()

  if (isLoading) {
    return null
  }

  if (!hasMeasurements) {
    return (
      <Box p={4} borderRadius="md" bg="bg.muted">
        <VStack gap={2} align="start">
          <HStack gap={2}>
            <Icon as={FaRuler} color="fg.muted" />
            <Text fontWeight="medium">Подбор размера</Text>
          </HStack>
          <Text fontSize="sm" color="fg.muted">
            Чтобы узнать какой размер вам подойдёт,{' '}
            <Link href="/profile/measurements" style={{ textDecoration: 'underline' }}>
              укажите свои мерки
            </Link>
          </Text>
        </VStack>
      </Box>
    )
  }

  const comparison = compareWithSizeChart(sizeChart)

  // Находим лучший размер
  const bestFit = comparison.find((c) => c.fit === 'perfect') || comparison[0]

  const getFitBadge = (fit: 'tight' | 'perfect' | 'loose') => {
    switch (fit) {
      case 'perfect':
        return (
          <Badge colorPalette="green" variant="solid">
            <Icon as={FaCheck} mr={1} />
            Идеально
          </Badge>
        )
      case 'tight':
        return (
          <Badge colorPalette="orange" variant="subtle">
            Может быть тесно
          </Badge>
        )
      case 'loose':
        return (
          <Badge colorPalette="blue" variant="subtle">
            Свободная посадка
          </Badge>
        )
    }
  }

  return (
    <Box borderRadius="md" borderWidth="1px" overflow="hidden">
      <Box p={3} bg="bg.muted" borderBottomWidth="1px">
        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <HStack gap={2}>
            <Icon as={FaRuler} color="fg.muted" />
            <Text fontWeight="medium">Ваш размер</Text>
          </HStack>
          <HStack gap={2}>
            <Text fontSize="sm" color="fg.muted">
              Мерки: грудь {measurements?.bust || '—'}, талия {measurements?.waist || '—'}, бёдра{' '}
              {measurements?.hips || '—'} см
            </Text>
            <Link href="/profile/measurements" style={{ fontSize: '12px', textDecoration: 'underline' }}>
              Изменить
            </Link>
          </HStack>
        </HStack>
      </Box>

      {/* Рекомендация */}
      {bestFit && (
        <Box p={3} bg="green.50" _dark={{ bg: 'green.900/20' }}>
          <HStack gap={2}>
            <Icon as={FaCheck} color="green.500" />
            <Text fontWeight="medium">Рекомендуемый размер: {bestFit.size}</Text>
          </HStack>
        </Box>
      )}

      {/* Таблица сравнения */}
      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Размер</Table.ColumnHeader>
            <Table.ColumnHeader>Посадка</Table.ColumnHeader>
            <Table.ColumnHeader>Отличие от ваших мерок</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {comparison.map((row) => (
            <Table.Row
              key={row.size}
              bg={row.fit === 'perfect' ? 'green.50' : undefined}
              _dark={row.fit === 'perfect' ? { bg: 'green.900/20' } : undefined}
            >
              <Table.Cell fontWeight={row.fit === 'perfect' ? 'bold' : 'normal'}>{row.size}</Table.Cell>
              <Table.Cell>{getFitBadge(row.fit)}</Table.Cell>
              <Table.Cell>
                <Text fontSize="xs" color="fg.muted">
                  {row.details}
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
