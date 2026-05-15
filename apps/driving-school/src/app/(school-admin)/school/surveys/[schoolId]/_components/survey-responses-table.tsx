'use client'

/**
 * Таблица ответов на опрос.
 */

import { Avatar, Badge, Box, Button, HStack, Icon, Table, Text, VStack } from '@chakra-ui/react'
import { LuArrowLeft, LuClock, LuMessageSquare } from 'react-icons/lu'

import type { SurveyResponseWithStudent } from '../../_actions/survey.action'

interface SurveyResponsesTableProps {
  responses: SurveyResponseWithStudent[]
  onBack: () => void
  surveyName: string
}

/**
 * Цвет NPS
 */
function getNpsColor(score: number | null): string {
  if (score === null) {
    return 'gray'
  }
  if (score >= 9) {
    return 'green'
  } // Promoter
  if (score >= 7) {
    return 'yellow'
  } // Passive
  return 'red' // Detractor
}

/**
 * Категория NPS
 */
function getNpsCategory(score: number | null): string {
  if (score === null) {
    return '—'
  }
  if (score >= 9) {
    return 'Промоутер'
  }
  if (score >= 7) {
    return 'Нейтральный'
  }
  return 'Критик'
}

/**
 * Цвет статуса
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'green'
    case 'SENT':
      return 'blue'
    case 'PENDING':
      return 'gray'
    case 'SKIPPED':
      return 'orange'
    case 'CANCELLED':
      return 'red'
    default:
      return 'gray'
  }
}

/**
 * Название статуса
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'Заполнен'
    case 'SENT':
      return 'Отправлен'
    case 'PENDING':
      return 'Ожидает'
    case 'SKIPPED':
      return 'Пропущен'
    case 'CANCELLED':
      return 'Отменён'
    default:
      return status
  }
}

export function SurveyResponsesTable({ responses, onBack, surveyName }: SurveyResponsesTableProps) {
  return (
    <VStack align="stretch" gap={4}>
      {/* Заголовок */}
      <HStack gap={3}>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <LuArrowLeft />
        </Button>
        <VStack align="start" gap={0}>
          <Text fontWeight="semibold">Ответы на опрос</Text>
          <Text fontSize="sm" color="fg.muted">
            {surveyName}
          </Text>
        </VStack>
      </HStack>

      {/* Таблица */}
      <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Ученик</Table.ColumnHeader>
              <Table.ColumnHeader>Статус</Table.ColumnHeader>
              <Table.ColumnHeader>NPS</Table.ColumnHeader>
              <Table.ColumnHeader>Комментарии</Table.ColumnHeader>
              <Table.ColumnHeader>Дата</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {responses.map((response) => (
              <Table.Row key={response.id}>
                {/* Ученик */}
                <Table.Cell>
                  <HStack gap={3}>
                    <Avatar.Root size="sm">
                      <Avatar.Image src={response.student.image ?? undefined} />
                      <Avatar.Fallback name={response.student.name} />
                    </Avatar.Root>
                    <VStack align="start" gap={0}>
                      <Text fontWeight="medium" fontSize="sm">
                        {response.student.name}
                      </Text>
                      {response.student.phone && (
                        <Text fontSize="xs" color="fg.muted">
                          {response.student.phone}
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                </Table.Cell>

                {/* Статус */}
                <Table.Cell>
                  <Badge colorPalette={getStatusColor(response.status)} size="sm">
                    {getStatusLabel(response.status)}
                  </Badge>
                </Table.Cell>

                {/* NPS */}
                <Table.Cell>
                  {response.npsScore !== null ? (
                    <VStack align="center" gap={0}>
                      <Badge colorPalette={getNpsColor(response.npsScore)} size="lg" variant="solid">
                        {response.npsScore}
                      </Badge>
                      <Text fontSize="xs" color="fg.muted">
                        {getNpsCategory(response.npsScore)}
                      </Text>
                    </VStack>
                  ) : (
                    <Text color="fg.muted">—</Text>
                  )}
                </Table.Cell>

                {/* Комментарии */}
                <Table.Cell maxW="300px">
                  {response.positiveComment || response.improvementComment ? (
                    <VStack align="start" gap={1}>
                      {response.positiveComment && (
                        <HStack gap={1} align="start">
                          <Icon boxSize={3} color="green.500" mt={0.5}>
                            <LuMessageSquare />
                          </Icon>
                          <Text fontSize="xs" lineClamp={2}>
                            {response.positiveComment}
                          </Text>
                        </HStack>
                      )}
                      {response.improvementComment && (
                        <HStack gap={1} align="start">
                          <Icon boxSize={3} color="orange.500" mt={0.5}>
                            <LuMessageSquare />
                          </Icon>
                          <Text fontSize="xs" lineClamp={2}>
                            {response.improvementComment}
                          </Text>
                        </HStack>
                      )}
                    </VStack>
                  ) : (
                    <Text color="fg.muted" fontSize="xs">
                      —
                    </Text>
                  )}
                </Table.Cell>

                {/* Дата */}
                <Table.Cell>
                  <VStack align="start" gap={0}>
                    {response.completedAt ? (
                      <>
                        <Text fontSize="xs">{new Date(response.completedAt).toLocaleDateString('ru-RU')}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {new Date(response.completedAt).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </>
                    ) : response.sentAt ? (
                      <HStack gap={1}>
                        <Icon boxSize={3} color="fg.muted">
                          <LuClock />
                        </Icon>
                        <Text fontSize="xs" color="fg.muted">
                          Отправлен {new Date(response.sentAt).toLocaleDateString('ru-RU')}
                        </Text>
                      </HStack>
                    ) : (
                      <Text color="fg.muted" fontSize="xs">
                        —
                      </Text>
                    )}
                  </VStack>
                </Table.Cell>
              </Table.Row>
            ))}

            {responses.length === 0 && (
              <Table.Row>
                <Table.Cell colSpan={5} textAlign="center" py={8}>
                  <Text color="fg.muted">Нет ответов</Text>
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </VStack>
  )
}
