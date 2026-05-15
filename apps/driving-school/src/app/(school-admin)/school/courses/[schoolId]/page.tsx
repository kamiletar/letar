'use client'

import { Box, Button, HStack, Separator, Spinner, Text, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuPlus } from 'react-icons/lu'

import { getCoursesAction, type TrainingCourseSummary } from '../_actions/courses.action'
import { CourseFormDialog } from './_components/course-form-dialog'
import { CoursesList } from './_components/courses-list'
import { MeetingPointsSection } from './_components/meeting-points-section'
import { OptionalLessonsSection } from './_components/optional-lessons-section'

export default function SchoolCoursesPage() {
  const params = useParams()
  const schoolId = params.schoolId as string
  const queryClient = useQueryClient()

  const [courses, setCourses] = useState<TrainingCourseSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const loadCourses = useCallback(async () => {
    setIsLoading(true)
    const result = await getCoursesAction(schoolId)
    if (result.success) {
      setCourses(result.courses)
    }
    setIsLoading(false)
  }, [schoolId])

  useEffect(() => {
    loadCourses()
  }, [loadCourses])

  const handleSuccess = () => {
    setIsCreateOpen(false)
    loadCourses()
    // Инвалидируем кэш для связанных запросов
    queryClient.invalidateQueries({ queryKey: ['TrainingCourse'] })
  }

  return (
    <VStack gap={8} align="stretch">
      {/* Секция курсов */}
      <Box>
        <HStack justify="space-between" mb={4}>
          <Text fontSize="xl" fontWeight="semibold">
            Курсы обучения
          </Text>
          <Button colorPalette="brand" onClick={() => setIsCreateOpen(true)}>
            <LuPlus />
            Создать курс
          </Button>
        </HStack>

        {isLoading ? (
          <HStack justify="center" py={12}>
            <Spinner />
            <Text>Загрузка курсов...</Text>
          </HStack>
        ) : (
          <CoursesList courses={courses} schoolId={schoolId} onRefresh={loadCourses} />
        )}
      </Box>

      <Separator />

      {/* Секция опциональных занятий */}
      <OptionalLessonsSection schoolId={schoolId} />

      <Separator />

      {/* Секция точек встречи */}
      <MeetingPointsSection schoolId={schoolId} />

      {/* Диалог создания курса */}
      <CourseFormDialog
        schoolId={schoolId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={handleSuccess}
      />
    </VStack>
  )
}
