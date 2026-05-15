'use client'

import { Badge, Box, Card, EmptyState, HStack, IconButton, Table, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { LuArchive, LuBookOpen, LuPencil, LuRefreshCw, LuTrash2 } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import type { TheoryTopicSummary } from '../_actions/theory-topic.action'
import {
  archiveTheoryTopicAction,
  deleteTheoryTopicAction,
  restoreTheoryTopicAction,
} from '../_actions/theory-topic.action'

// Локализация категорий
const categoryLabels: Record<string, string> = {
  M: 'M',
  A1: 'A1',
  A: 'A',
  B1: 'B1',
  B: 'B',
  C1: 'C1',
  C: 'C',
  D1: 'D1',
  D: 'D',
  BE: 'BE',
  CE: 'CE',
  C1E: 'C1E',
  DE: 'DE',
  D1E: 'D1E',
  Tm: 'Tm',
  Tb: 'Tb',
}

interface TheoryTopicsListProps {
  topics: TheoryTopicSummary[]
  schoolId: string
}

export function TheoryTopicsList({ topics, schoolId }: TheoryTopicsListProps) {
  if (topics.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuBookOpen />
          </EmptyState.Indicator>
          <EmptyState.Title>Нет тем</EmptyState.Title>
          <EmptyState.Description>Создайте первую тему для теоретических занятий</EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  const activeTopics = topics.filter((t) => t.isActive)
  const archivedTopics = topics.filter((t) => !t.isActive)

  return (
    <VStack gap={6} align="stretch">
      {/* Активные темы */}
      {activeTopics.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Активные темы ({activeTopics.length})
          </Text>
          <Card.Root>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader width="60px">#</Table.ColumnHeader>
                  <Table.ColumnHeader>Название</Table.ColumnHeader>
                  <Table.ColumnHeader>Категории</Table.ColumnHeader>
                  <Table.ColumnHeader>Занятий</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {activeTopics.map((topic) => (
                  <TopicRow key={topic.id} topic={topic} schoolId={schoolId} />
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Root>
        </Box>
      )}

      {/* Архивированные темы */}
      {archivedTopics.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4} color="fg.muted">
            Архив ({archivedTopics.length})
          </Text>
          <Card.Root opacity={0.7}>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader width="60px">#</Table.ColumnHeader>
                  <Table.ColumnHeader>Название</Table.ColumnHeader>
                  <Table.ColumnHeader>Категории</Table.ColumnHeader>
                  <Table.ColumnHeader>Занятий</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {archivedTopics.map((topic) => (
                  <TopicRow key={topic.id} topic={topic} schoolId={schoolId} isArchived />
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Root>
        </Box>
      )}
    </VStack>
  )
}

interface TopicRowProps {
  topic: TheoryTopicSummary
  schoolId: string

  isArchived?: boolean
}

function TopicRow({ topic, schoolId, isArchived }: TopicRowProps) {
  const queryClient = useQueryClient()

  const handleArchive = async () => {
    const result = await archiveTheoryTopicAction(topic.id)
    if (result.success) {
      toaster.success({ title: 'Тема архивирована' })
      // Автоматически обновить список тем
      queryClient.invalidateQueries({ queryKey: ['TheoryTopic'] })
    } else {
      toaster.error({ title: 'Ошибка', description: 'Не удалось архивировать тему' })
    }
  }

  const handleRestore = async () => {
    const result = await restoreTheoryTopicAction(topic.id)
    if (result.success) {
      toaster.success({ title: 'Тема восстановлена' })
      // Автоматически обновить список тем
      queryClient.invalidateQueries({ queryKey: ['TheoryTopic'] })
    } else {
      toaster.error({ title: 'Ошибка', description: 'Не удалось восстановить тему' })
    }
  }

  const handleDelete = async () => {
    const result = await deleteTheoryTopicAction(topic.id)
    if (result.success) {
      toaster.success({ title: 'Тема удалена' })
      // Автоматически обновить список тем
      queryClient.invalidateQueries({ queryKey: ['TheoryTopic'] })
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.message || 'Не удалось удалить тему',
      })
    }
  }

  return (
    <Table.Row>
      <Table.Cell>
        <Text color="fg.muted">{topic.sortOrder + 1}</Text>
      </Table.Cell>
      <Table.Cell>
        <Box>
          <Text fontWeight="medium">{topic.name}</Text>
          {topic.description && (
            <Text fontSize="xs" color="fg.muted" lineClamp={1}>
              {topic.description}
            </Text>
          )}
        </Box>
      </Table.Cell>
      <Table.Cell>
        {topic.categories && topic.categories.length > 0 ? (
          <HStack gap={1} flexWrap="wrap">
            {topic.categories.map((cat) => (
              <Badge key={cat} colorPalette="purple" size="sm">
                {categoryLabels[cat] || cat}
              </Badge>
            ))}
          </HStack>
        ) : (
          <Text color="fg.muted" fontSize="sm">
            Все
          </Text>
        )}
      </Table.Cell>
      <Table.Cell>
        <Text>{topic.lessonsCount}</Text>
      </Table.Cell>
      <Table.Cell textAlign="right">
        <HStack gap={1} justify="flex-end">
          {isArchived ? (
            <>
              <IconButton
                aria-label="Восстановить тему"
                variant="ghost"
                size="sm"
                onClick={handleRestore}
                title="Восстановить"
              >
                <LuRefreshCw />
              </IconButton>
              {topic.lessonsCount === 0 && (
                <IconButton
                  aria-label="Удалить тему"
                  variant="ghost"
                  size="sm"
                  colorPalette="red"
                  onClick={handleDelete}
                  title="Удалить навсегда"
                >
                  <LuTrash2 />
                </IconButton>
              )}
            </>
          ) : (
            <>
              <IconButton aria-label="Редактировать тему" variant="ghost" size="sm" asChild title="Редактировать">
                <Link href={`/school/theory-topics/topic/${topic.id}?schoolId=${schoolId}`}>
                  <LuPencil />
                </Link>
              </IconButton>
              <IconButton
                aria-label="Архивировать тему"
                variant="ghost"
                size="sm"
                colorPalette="red"
                onClick={handleArchive}
                title="Архивировать"
              >
                <LuArchive />
              </IconButton>
            </>
          )}
        </HStack>
      </Table.Cell>
    </Table.Row>
  )
}
