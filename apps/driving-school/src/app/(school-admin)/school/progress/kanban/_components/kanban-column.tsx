'use client'

import { Badge, Box, Card, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

import type { StudentProgressSummary } from '../../_actions/progress.action'
import { getColumnConfig, type KanbanStage } from '../_lib/kanban-config'
import { KanbanCard } from './kanban-card'

interface KanbanColumnProps {
  id: KanbanStage
  students: StudentProgressSummary[]
  schoolId: string
  isLoading?: boolean
}

/**
 * Колонка Kanban-доски
 * Использует SortableContext для сортировки и useDroppable для drop target
 */
export function KanbanColumn({ id, students, schoolId, isLoading }: KanbanColumnProps) {
  const config = getColumnConfig(id)
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <Card.Root
      minW="280px"
      maxW="320px"
      w="full"
      h="fit-content"
      maxH="calc(100vh - 200px)"
      bg="bg.muted"
      borderColor={isOver ? `${config.color}.emphasized` : 'border.muted'}
      borderWidth={isOver ? '2px' : '1px'}
      transition="all 0.2s"
    >
      {/* Заголовок колонки */}
      <Card.Header p={3} pb={2}>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Icon color={`${config.color}.fg`}>
              <config.icon />
            </Icon>
            <Text fontWeight="semibold" fontSize="sm">
              {config.title}
            </Text>
          </HStack>
          <Badge colorPalette={config.color} variant="subtle" size="sm">
            {students.length}
          </Badge>
        </HStack>
        <Text fontSize="xs" color="fg.muted" mt={1}>
          {config.description}
        </Text>
      </Card.Header>

      {/* Список карточек */}
      <Card.Body p={2} pt={0}>
        <Box
          ref={setNodeRef}
          minH="100px"
          maxH="calc(100vh - 300px)"
          overflowY="auto"
          opacity={isLoading ? 0.5 : 1}
          transition="opacity 0.2s"
          css={{
            // Стили для скроллбара
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'var(--chakra-colors-border-muted)',
              borderRadius: '3px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'var(--chakra-colors-border-emphasized)',
            },
          }}
        >
          <SortableContext items={students.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <VStack gap={2} align="stretch">
              {students.map((student) => (
                <KanbanCard key={student.id} student={student} schoolId={schoolId} />
              ))}

              {/* Пустое состояние */}
              {students.length === 0 && (
                <Box
                  p={4}
                  textAlign="center"
                  borderRadius="md"
                  borderWidth="1px"
                  borderStyle="dashed"
                  borderColor="border.muted"
                >
                  <Text fontSize="sm" color="fg.muted">
                    Нет учеников
                  </Text>
                </Box>
              )}
            </VStack>
          </SortableContext>
        </Box>
      </Card.Body>
    </Card.Root>
  )
}
