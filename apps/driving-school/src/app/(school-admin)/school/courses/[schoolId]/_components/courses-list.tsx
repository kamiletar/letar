'use client'

import { Badge, Box, EmptyState, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { TheoryFormat, TransmissionType } from '@letar/driving-school-db/prisma'
import { LuBookOpen } from 'react-icons/lu'

import type { TrainingCourseSummary } from '../../_actions/courses.action'
import { CourseCard } from './course-card'

// Локализация формата теории
export const THEORY_FORMAT_LABELS: Record<TheoryFormat, string> = {
  CLASSROOM: 'Очно',
  DISTANCE: 'Дистанционно',
  ONLINE: 'Онлайн',
  HYBRID: 'Смешанный',
}

// Локализация типа трансмиссии
export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  MANUAL: 'МКПП',
  AUTOMATIC: 'АКПП',
}

interface CoursesListProps {
  courses: TrainingCourseSummary[]
  schoolId: string
  onRefresh: () => void
}

export function CoursesList({ courses, schoolId, onRefresh }: CoursesListProps) {
  if (courses.length === 0) {
    return (
      <EmptyState.Root>
        <EmptyState.Content>
          <EmptyState.Indicator>
            <LuBookOpen />
          </EmptyState.Indicator>
          <EmptyState.Title>Нет курсов обучения</EmptyState.Title>
          <EmptyState.Description>Создайте первый курс для записи учеников на обучение</EmptyState.Description>
        </EmptyState.Content>
      </EmptyState.Root>
    )
  }

  const activeCourses = courses.filter((c) => c.isActive)
  const inactiveCourses = courses.filter((c) => !c.isActive)

  return (
    <VStack gap={6} align="stretch">
      {/* Активные курсы */}
      {activeCourses.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4}>
            Активные курсы ({activeCourses.length})
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {activeCourses.map((course) => (
              <CourseCard key={course.id} course={course} schoolId={schoolId} onRefresh={onRefresh} />
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Неактивные курсы */}
      {inactiveCourses.length > 0 && (
        <Box>
          <Text fontSize="lg" fontWeight="semibold" mb={4} color="fg.muted">
            <Badge colorPalette="gray" mr={2}>
              Неактивные
            </Badge>
            ({inactiveCourses.length})
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {inactiveCourses.map((course) => (
              <CourseCard key={course.id} course={course} schoolId={schoolId} onRefresh={onRefresh} isInactive />
            ))}
          </SimpleGrid>
        </Box>
      )}
    </VStack>
  )
}
