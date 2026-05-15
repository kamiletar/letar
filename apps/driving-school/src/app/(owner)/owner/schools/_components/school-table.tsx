'use client'

import { Badge, Box, Button, HStack, Icon, Link, Table, Text, VStack } from '@chakra-ui/react'
import { formatDate } from '@letar/format-utils'
import { LuBuilding2, LuCheck, LuEye, LuMapPin, LuStar } from 'react-icons/lu'

import { ModerateSchoolButton } from './ModerateSchoolButton'

interface SchoolData {
  id: string
  name: string
  logo: string | null
  cities: string[]
  isPublic: boolean
  instructors: number
  students: number
  averageRating: number | null
  reviewCount: number
  createdAt: Date
  owner: {
    name: string | null
    email: string
  } | null
}

interface SchoolTableProps {
  schools: SchoolData[]
}

export function SchoolTable({ schools }: SchoolTableProps) {
  if (schools.length === 0) {
    return (
      <Box p={6} textAlign="center">
        <Text color="fg.muted">Автошколы ещё не зарегистрированы</Text>
      </Box>
    )
  }

  return (
    <Box overflowX="auto">
      <Table.Root size="sm" variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Название</Table.ColumnHeader>
            <Table.ColumnHeader>Владелец</Table.ColumnHeader>
            <Table.ColumnHeader>Город</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Инструкторы</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Ученики</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="center">Рейтинг</Table.ColumnHeader>
            <Table.ColumnHeader>Дата создания</Table.ColumnHeader>
            <Table.ColumnHeader>Статус</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {schools.map((school) => (
            <Table.Row key={school.id}>
              {/* Название */}
              <Table.Cell>
                <HStack gap={2}>
                  {school.logo ? (
                    <Box boxSize={8} borderRadius="md" overflow="hidden">
                      {/* oxlint-disable-next-line eslint-plugin-next(no-img-element) -- внешний URL */}
                      <img
                        src={school.logo}
                        alt={school.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                  ) : (
                    <Box p={2} bg="bg.muted" borderRadius="md">
                      <Icon as={LuBuilding2} boxSize={4} color="fg.muted" />
                    </Box>
                  )}
                  <Text fontWeight="medium">{school.name}</Text>
                </HStack>
              </Table.Cell>

              {/* Владелец */}
              <Table.Cell>
                {school.owner ? (
                  <VStack align="start" gap={0}>
                    <Text fontSize="sm">{school.owner.name}</Text>
                    <Text fontSize="xs" color="fg.muted">
                      {school.owner.email}
                    </Text>
                  </VStack>
                ) : (
                  <Text fontSize="sm" color="fg.muted">
                    Не указан
                  </Text>
                )}
              </Table.Cell>

              {/* Города */}
              <Table.Cell>
                {school.cities.length > 0 ? (
                  <HStack gap={1} fontSize="sm">
                    <Icon as={LuMapPin} boxSize={3} color="fg.muted" />
                    <Text>{school.cities.join(', ')}</Text>
                  </HStack>
                ) : (
                  <Text fontSize="sm" color="fg.muted">
                    Не указаны
                  </Text>
                )}
              </Table.Cell>

              {/* Инструкторы */}
              <Table.Cell textAlign="center">
                <Badge variant="subtle" colorPalette="brand">
                  {school.instructors}
                </Badge>
              </Table.Cell>

              {/* Ученики */}
              <Table.Cell textAlign="center">
                <Badge variant="subtle" colorPalette="purple">
                  {school.students}
                </Badge>
              </Table.Cell>

              {/* Рейтинг */}
              <Table.Cell textAlign="center">
                {school.averageRating ? (
                  <HStack gap={1} justify="center">
                    <Icon as={LuStar} boxSize={3} color="accent.solid" />
                    <Text fontSize="sm" fontWeight="medium">
                      {school.averageRating.toFixed(1)}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      ({school.reviewCount})
                    </Text>
                  </HStack>
                ) : (
                  <Text fontSize="sm" color="fg.muted">
                    Нет отзывов
                  </Text>
                )}
              </Table.Cell>

              {/* Дата создания */}
              <Table.Cell>
                <Text fontSize="sm">{formatDate(school.createdAt)}</Text>
              </Table.Cell>

              {/* Статус */}
              <Table.Cell>
                {school.isPublic ? (
                  <Badge variant="subtle" colorPalette="green">
                    <HStack gap={1}>
                      <Icon as={LuCheck} boxSize={3} />
                      <span>Опубликована</span>
                    </HStack>
                  </Badge>
                ) : (
                  <Badge variant="subtle" colorPalette="orange">
                    <HStack gap={1}>
                      <Icon as={LuEye} boxSize={3} />
                      <span>Скрыта</span>
                    </HStack>
                  </Badge>
                )}
              </Table.Cell>

              {/* Действия */}
              <Table.Cell>
                <HStack gap={2} justify="end">
                  {/* Кнопка модерации */}
                  {school.isPublic ? (
                    <ModerateSchoolButton organizationId={school.id} organizationName={school.name} action="reject" />
                  ) : (
                    <ModerateSchoolButton organizationId={school.id} organizationName={school.name} action="approve" />
                  )}

                  {/* Ссылка на детали (пока заглушка) */}
                  <Link asChild>
                    <Button size="xs" variant="ghost" colorPalette="brand" disabled>
                      Детали
                    </Button>
                  </Link>
                </HStack>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}
