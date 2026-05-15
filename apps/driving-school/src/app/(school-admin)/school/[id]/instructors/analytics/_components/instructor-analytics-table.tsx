'use client'

/**
 * Таблица с детальной аналитикой по инструкторам.
 */

import { Avatar, Badge, Box, HStack, Icon, Progress, Table, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuArrowUpDown, LuCar, LuClock, LuHeart, LuMessageSquare, LuShield, LuStar, LuThumbsUp } from 'react-icons/lu'

import type { InstructorAnalyticsData } from '../../../_actions/instructor-analytics.action'

interface InstructorAnalyticsTableProps {
  instructors: InstructorAnalyticsData[]
}

type SortField = 'name' | 'averageRating' | 'reviewCount' | 'recommendRate' | 'completionRate' | 'activeStudents'
type SortOrder = 'asc' | 'desc'

/**
 * Индикатор качественного аспекта (прогресс-бар)
 */
function QualityIndicator({
  label,
  value,
  icon,
  colorPalette,
}: {
  label: string
  value: number | null
  icon: React.ReactNode
  colorPalette: string
}) {
  if (value === null) {
    return (
      <HStack gap={1} title={label}>
        <Icon boxSize={3} color="fg.muted">
          {icon}
        </Icon>
        <Text fontSize="xs" color="fg.muted">
          —
        </Text>
      </HStack>
    )
  }

  return (
    <HStack gap={1} title={`${label}: ${value}%`}>
      <Icon boxSize={3} color={`${colorPalette}.fg`}>
        {icon}
      </Icon>
      <Box flex={1} minW="40px">
        <Progress.Root value={value} size="xs" colorPalette={colorPalette}>
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      </Box>
      <Text fontSize="xs" fontWeight="medium" minW="32px" textAlign="right">
        {value}%
      </Text>
    </HStack>
  )
}

/**
 * Рейтинг со звёздами
 */
function RatingDisplay({ rating, reviewCount }: { rating: number | null; reviewCount: number }) {
  if (rating === null) {
    return (
      <VStack gap={0} align="center">
        <Text fontSize="sm" color="fg.muted">
          —
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {reviewCount} отз.
        </Text>
      </VStack>
    )
  }

  return (
    <VStack gap={0} align="center">
      <HStack gap={1}>
        <Icon boxSize={4} color="yellow.500">
          <LuStar fill="currentColor" />
        </Icon>
        <Text fontSize="sm" fontWeight="bold">
          {rating.toFixed(1)}
        </Text>
      </HStack>
      <Text fontSize="xs" color="fg.muted">
        {reviewCount} отз.
      </Text>
    </VStack>
  )
}

export function InstructorAnalyticsTable({ instructors }: InstructorAnalyticsTableProps) {
  const [sortField, setSortField] = useState<SortField>('averageRating')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedInstructors = [...instructors].sort((a, b) => {
    const aVal: number | string | null = a[sortField]
    const bVal: number | string | null = b[sortField]

    // Null значения в конец
    if (aVal === null && bVal === null) {
      return 0
    }
    if (aVal === null) {
      return 1
    }
    if (bVal === null) {
      return -1
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }

    return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number)
  })

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Table.ColumnHeader cursor="pointer" onClick={() => handleSort(field)} _hover={{ bg: 'bg.subtle' }}>
      <HStack gap={1}>
        {children}
        <Icon boxSize={3} color={sortField === field ? 'fg' : 'fg.muted'}>
          <LuArrowUpDown />
        </Icon>
      </HStack>
    </Table.ColumnHeader>
  )

  return (
    <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
      <Table.Root size="sm" variant="outline">
        <Table.Header>
          <Table.Row>
            <SortableHeader field="name">Инструктор</SortableHeader>
            <SortableHeader field="averageRating">Рейтинг</SortableHeader>
            <Table.ColumnHeader>Качественные аспекты</Table.ColumnHeader>
            <SortableHeader field="completionRate">Занятия</SortableHeader>
            <SortableHeader field="activeStudents">Ученики</SortableHeader>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {sortedInstructors.map((instructor) => (
            <Table.Row key={instructor.id}>
              {/* Инструктор */}
              <Table.Cell>
                <HStack gap={3}>
                  <Avatar.Root size="sm">
                    <Avatar.Image src={instructor.image ?? undefined} />
                    <Avatar.Fallback name={instructor.name} />
                  </Avatar.Root>
                  <VStack align="start" gap={0}>
                    <Text fontWeight="medium" fontSize="sm">
                      {instructor.name}
                    </Text>
                    {instructor.phone && (
                      <Text fontSize="xs" color="fg.muted">
                        {instructor.phone}
                      </Text>
                    )}
                  </VStack>
                </HStack>
              </Table.Cell>

              {/* Рейтинг */}
              <Table.Cell>
                <RatingDisplay rating={instructor.averageRating} reviewCount={instructor.reviewCount} />
              </Table.Cell>

              {/* Качественные аспекты */}
              <Table.Cell minW="200px">
                <VStack align="stretch" gap={1}>
                  <QualityIndicator
                    label="Пунктуальность"
                    value={instructor.onTimeRate}
                    icon={<LuClock />}
                    colorPalette="green"
                  />
                  <QualityIndicator
                    label="Терпеливость"
                    value={instructor.patienceRate}
                    icon={<LuHeart />}
                    colorPalette="blue"
                  />
                  <QualityIndicator
                    label="Объяснение"
                    value={instructor.explanationRate}
                    icon={<LuMessageSquare />}
                    colorPalette="purple"
                  />
                  <QualityIndicator
                    label="Безопасность"
                    value={instructor.safetyRate}
                    icon={<LuShield />}
                    colorPalette="orange"
                  />
                  <QualityIndicator
                    label="Рекомендации"
                    value={instructor.recommendRate}
                    icon={<LuThumbsUp />}
                    colorPalette="teal"
                  />
                  {instructor.avgVehicleRating !== null && (
                    <HStack gap={1} title={`Автомобиль: ${instructor.avgVehicleRating}`}>
                      <Icon boxSize={3} color="gray.fg">
                        <LuCar />
                      </Icon>
                      <Text fontSize="xs">{instructor.avgVehicleRating.toFixed(1)}</Text>
                      <Icon boxSize={3} color="yellow.500">
                        <LuStar fill="currentColor" />
                      </Icon>
                    </HStack>
                  )}
                </VStack>
              </Table.Cell>

              {/* Занятия */}
              <Table.Cell>
                <VStack gap={1} align="center">
                  <HStack gap={1}>
                    <Text fontSize="sm" fontWeight="bold">
                      {instructor.completedLessons}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      / {instructor.totalLessons}
                    </Text>
                  </HStack>
                  <Badge
                    size="sm"
                    colorPalette={
                      instructor.completionRate >= 90 ? 'green' : instructor.completionRate >= 70 ? 'yellow' : 'red'
                    }
                  >
                    {instructor.completionRate}%
                  </Badge>
                </VStack>
              </Table.Cell>

              {/* Ученики */}
              <Table.Cell textAlign="center">
                <Text fontWeight="medium">{instructor.activeStudents}</Text>
                <Text fontSize="xs" color="fg.muted">
                  активных
                </Text>
              </Table.Cell>
            </Table.Row>
          ))}

          {sortedInstructors.length === 0 && (
            <Table.Row>
              <Table.Cell colSpan={5} textAlign="center" py={8}>
                <Text color="fg.muted">Нет инструкторов для отображения</Text>
              </Table.Cell>
            </Table.Row>
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
