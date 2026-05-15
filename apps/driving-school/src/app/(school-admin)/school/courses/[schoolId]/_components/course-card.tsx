'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Card, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuArchive, LuBookOpen, LuCar, LuPencil, LuRefreshCw, LuUsers, LuWallet } from 'react-icons/lu'

import type { TrainingCourseSummary } from '../../_actions/courses.action'
import { activateCourseAction, deactivateCourseAction } from '../../_actions/courses.action'
import { CourseFormDialog } from './course-form-dialog'
import { THEORY_FORMAT_LABELS, TRANSMISSION_LABELS } from './courses-list'

interface CourseCardProps {
  course: TrainingCourseSummary
  schoolId: string
  onRefresh: () => void
  isInactive?: boolean
}

export function CourseCard({ course, schoolId, onRefresh, isInactive }: CourseCardProps) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleDeactivate = async () => {
    setIsProcessing(true)
    const result = await deactivateCourseAction(course.id)
    setIsProcessing(false)

    if (result.success) {
      toaster.success({ title: 'Курс деактивирован' })
      onRefresh()
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.message || 'Не удалось деактивировать курс',
      })
    }
  }

  const handleActivate = async () => {
    setIsProcessing(true)
    const result = await activateCourseAction(course.id)
    setIsProcessing(false)

    if (result.success) {
      toaster.success({ title: 'Курс активирован' })
      onRefresh()
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.message || 'Не удалось активировать курс',
      })
    }
  }

  const handleEditSuccess = () => {
    setIsEditOpen(false)
    onRefresh()
  }

  // Форматирование цены
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price)
  }

  return (
    <>
      <Card.Root opacity={isInactive ? 0.7 : 1}>
        <Card.Body>
          <VStack align="stretch" gap={3}>
            {/* Заголовок */}
            <HStack justify="space-between">
              <VStack align="start" gap={1}>
                <Text fontWeight="semibold" fontSize="lg">
                  {course.name}
                </Text>
                <HStack gap={2}>
                  <Badge colorPalette="purple" size="sm">
                    {course.category}
                  </Badge>
                  {course.transmissionType && (
                    <Badge colorPalette="blue" size="sm">
                      {TRANSMISSION_LABELS[course.transmissionType]}
                    </Badge>
                  )}
                </HStack>
              </VStack>
            </HStack>

            {/* Информация */}
            <VStack align="stretch" gap={2} fontSize="sm" color="fg.muted">
              <HStack gap={2}>
                <LuCar size={16} />
                <Text>
                  {course.practiceLessons} занятий по {course.lessonDuration} мин
                </Text>
              </HStack>

              <HStack gap={2}>
                <LuBookOpen size={16} />
                <Text>
                  {THEORY_FORMAT_LABELS[course.theoryFormat]}
                  {course.theoryHours && ` (${course.theoryHours} часов)`}
                </Text>
              </HStack>

              <HStack gap={2}>
                <LuWallet size={16} />
                <Text fontWeight="medium" color="fg">
                  {formatPrice(course.price)} руб.
                </Text>
              </HStack>

              <HStack gap={2}>
                <LuUsers size={16} />
                <Text>{course.enrollmentsCount} учеников</Text>
              </HStack>
            </VStack>

            {course.description && (
              <Text fontSize="sm" color="fg.muted" lineClamp={2}>
                {course.description}
              </Text>
            )}

            {/* Кнопки действий */}
            <HStack justify="flex-end" pt={2}>
              {isInactive ? (
                <IconButton
                  aria-label="Активировать курс"
                  variant="ghost"
                  size="sm"
                  onClick={handleActivate}
                  disabled={isProcessing}
                  title="Активировать"
                >
                  <LuRefreshCw />
                </IconButton>
              ) : (
                <>
                  <IconButton
                    aria-label="Редактировать курс"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                    title="Редактировать"
                  >
                    <LuPencil />
                  </IconButton>
                  <IconButton
                    aria-label="Деактивировать курс"
                    variant="ghost"
                    size="sm"
                    colorPalette="red"
                    onClick={handleDeactivate}
                    disabled={isProcessing}
                    title="Деактивировать"
                  >
                    <LuArchive />
                  </IconButton>
                </>
              )}
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Диалог редактирования */}
      <CourseFormDialog
        schoolId={schoolId}
        course={course}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSuccess={handleEditSuccess}
      />
    </>
  )
}
