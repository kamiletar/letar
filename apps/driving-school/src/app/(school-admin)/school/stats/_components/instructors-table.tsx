'use client'

import { Avatar, Badge, Card, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import type { InstructorSummary } from '../_actions/school-stats.action'

interface InstructorsTableProps {
  instructors: InstructorSummary[]
}

export function InstructorsTable({ instructors }: InstructorsTableProps) {
  if (instructors.length === 0) {
    return (
      <Card.Root>
        <Card.Header>
          <Heading size="md">Инструкторы</Heading>
        </Card.Header>
        <Card.Body>
          <VStack py={8}>
            <Text color="fg.muted">В школе пока нет инструкторов</Text>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">Инструкторы ({instructors.length})</Heading>
      </Card.Header>
      <Card.Body p={0}>
        <Table.ScrollArea>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Инструктор</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Учеников</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Занятий</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Завершено</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Отменено</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Неявки</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="center">Баланс</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {instructors.map((instructor) => {
                const completionRate =
                  instructor.totalLessons > 0
                    ? ((instructor.completedLessons / instructor.totalLessons) * 100).toFixed(0)
                    : '0'

                return (
                  <Table.Row key={instructor.id}>
                    <Table.Cell>
                      <HStack gap={3}>
                        <Avatar.Root size="sm">
                          {instructor.image && <Avatar.Image src={instructor.image} />}
                          <Avatar.Fallback>{instructor.name?.charAt(0) ?? '?'}</Avatar.Fallback>
                        </Avatar.Root>
                        <Text fontWeight="medium">{instructor.name ?? 'Без имени'}</Text>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Badge colorPalette="purple">
                        {instructor.activeStudents} / {instructor.totalStudents}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="center">{instructor.totalLessons}</Table.Cell>
                    <Table.Cell textAlign="center">
                      <HStack gap={1} justify="center">
                        <Text>{instructor.completedLessons}</Text>
                        <Text color="fg.muted" fontSize="xs">
                          ({completionRate}%)
                        </Text>
                      </HStack>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Badge colorPalette={instructor.cancelledLessons > 0 ? 'orange' : 'gray'}>
                        {instructor.cancelledLessons}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Badge colorPalette={instructor.noShowCount > 0 ? 'red' : 'gray'}>{instructor.noShowCount}</Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="center">
                      <Badge colorPalette="teal">{instructor.totalPrepaidBalance}</Badge>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table.Root>
        </Table.ScrollArea>
      </Card.Body>
    </Card.Root>
  )
}
