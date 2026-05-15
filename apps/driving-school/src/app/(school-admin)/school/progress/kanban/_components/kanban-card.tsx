'use client'

import { Avatar, Badge, Box, Card, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { LuGripVertical, LuTriangleAlert } from 'react-icons/lu'

import type { StudentProgressSummary } from '../../_actions/progress.action'

interface KanbanCardProps {
  student: StudentProgressSummary
  schoolId: string
  isDragOverlay?: boolean
}

/**
 * Карточка ученика для Kanban-доски
 * Использует useSortable для поддержки drag & drop
 */
export function KanbanCard({ student, schoolId, isDragOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: student.id,
    data: { student },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Определяем проблемы ученика
  const hasProblems = student.overallProgress < 30 || student.status === 'SUSPENDED'
  const isInactive = student.status === 'SUSPENDED' || student.status === 'EXPELLED'

  return (
    <Card.Root
      ref={setNodeRef}
      style={style}
      size="sm"
      variant="outline"
      opacity={isDragging && !isDragOverlay ? 0.3 : 1}
      shadow={isDragOverlay ? 'lg' : 'sm'}
      bg={isDragOverlay ? 'bg.panel' : undefined}
      borderColor={hasProblems ? 'orange.emphasized' : undefined}
      _hover={{ shadow: 'md', borderColor: 'border.emphasized' }}
      transition="all 0.2s"
    >
      <Card.Body p={3}>
        {/* Drag handle + Avatar + Info */}
        <HStack gap={2} align="start">
          {/* Drag handle */}
          <Box
            {...attributes}
            {...listeners}
            cursor="grab"
            _active={{ cursor: 'grabbing' }}
            color="fg.muted"
            _hover={{ color: 'fg' }}
            pt={1}
          >
            <LuGripVertical size={16} />
          </Box>

          {/* Avatar */}
          <Avatar.Root size="sm">
            <Avatar.Image src={student.user.image || undefined} />
            <Avatar.Fallback name={student.user.name || ''} />
          </Avatar.Root>

          {/* Info */}
          <VStack align="start" gap={0} flex={1} minW={0}>
            <Link href={`/school/progress/student/${student.id}?schoolId=${schoolId}`}>
              <Text
                fontWeight="medium"
                fontSize="sm"
                truncate
                _hover={{ color: 'colorPalette.fg', textDecoration: 'underline' }}
              >
                {student.user.name || 'Без имени'}
              </Text>
            </Link>
            <Text fontSize="xs" color="fg.muted" truncate>
              {student.user.phone || student.user.email}
            </Text>
          </VStack>

          {/* Warning icon */}
          {hasProblems && !isInactive && (
            <Box color="orange.fg">
              <LuTriangleAlert size={14} />
            </Box>
          )}
        </HStack>

        {/* Категории */}
        <HStack gap={1} mt={2} wrap="wrap">
          {student.categories.map((cat) => (
            <Badge key={cat.id} size="sm" colorPalette="purple" variant="subtle">
              {cat.category}
              {cat.transmissionRestriction && (cat.transmissionRestriction === 'AUTOMATIC' ? ' АТ' : ' МТ')}
            </Badge>
          ))}
          {student.categories.length === 0 && (
            <Text fontSize="xs" color="fg.muted">
              Нет категорий
            </Text>
          )}
        </HStack>

        {/* Прогресс-бар */}
        <Box mt={2}>
          <HStack justify="space-between" mb={1}>
            <Text fontSize="xs" color="fg.muted">
              Прогресс
            </Text>
            <Text fontSize="xs" fontWeight="medium">
              {student.overallProgress}%
            </Text>
          </HStack>
          <Progress.Root
            value={student.overallProgress}
            size="xs"
            colorPalette={student.overallProgress >= 75 ? 'green' : student.overallProgress >= 50 ? 'yellow' : 'red'}
          >
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        </Box>

        {/* Дата записи */}
        <Text fontSize="xs" color="fg.muted" mt={2}>
          {new Date(student.enrolledAt).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
          })}
          {student.studyGroup && ` · ${student.studyGroup.name}`}
        </Text>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Overlay версия карточки для отображения при перетаскивании
 */
export function KanbanCardOverlay({ student, schoolId }: Omit<KanbanCardProps, 'isDragOverlay'>) {
  return <KanbanCard student={student} schoolId={schoolId} isDragOverlay />
}
