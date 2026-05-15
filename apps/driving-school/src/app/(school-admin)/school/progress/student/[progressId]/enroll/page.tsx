'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Badge, Button, Card, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuCheck } from 'react-icons/lu'

import { getCoursesAction, type TrainingCourseSummary } from '../../../../courses/_actions/courses.action'
import {
  getOptionalLessonTypesAction,
  type OptionalLessonTypeSummary,
} from '../../../../courses/_actions/optional-lessons.action'
import { enrollStudentToCoursesAction } from '../../../_actions/enrollment.action'
import { getStudentProgressByIdAction, type StudentProgressDetails } from '../../../_actions/progress.action'
import { CourseSelector } from './_components/course-selector'
import { OptionalLessonsSelector } from './_components/optional-lessons-selector'
import { PaymentSummary } from './_components/payment-summary'

interface SelectedCourse {
  courseId: string
  initialPayment: number
}

interface SelectedOptional {
  lessonTypeId: string
  quantity: number
  price: number
}

export default function EnrollStudentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const progressId = params.progressId as string
  const schoolId = searchParams.get('schoolId') || ''

  const [progress, setProgress] = useState<StudentProgressDetails | null>(null)
  const [courses, setCourses] = useState<TrainingCourseSummary[]>([])
  const [optionalTypes, setOptionalTypes] = useState<OptionalLessonTypeSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [selectedCourses, setSelectedCourses] = useState<SelectedCourse[]>([])
  const [selectedOptionals, setSelectedOptionals] = useState<SelectedOptional[]>([])

  const loadData = useCallback(async () => {
    setIsLoading(true)

    const [progressResult, coursesResult, optionalsResult] = await Promise.all([
      getStudentProgressByIdAction(progressId),
      getCoursesAction(schoolId),
      getOptionalLessonTypesAction(schoolId),
    ])

    if (progressResult.success) {
      setProgress(progressResult.progress)
    }

    if (coursesResult.success) {
      // Только активные курсы
      setCourses(coursesResult.courses.filter((c) => c.isActive))
    }

    if (optionalsResult.success) {
      // Только активные типы
      setOptionalTypes(optionalsResult.lessonTypes.filter((t) => t.isActive))
    }

    setIsLoading(false)
  }, [progressId, schoolId])

  useEffect(() => {
    if (schoolId) {
      loadData()
    }
  }, [loadData, schoolId])

  const handleCourseToggle = (courseId: string, selected: boolean) => {
    if (selected) {
      setSelectedCourses((prev) => [...prev, { courseId, initialPayment: 0 }])
    } else {
      setSelectedCourses((prev) => prev.filter((c) => c.courseId !== courseId))
    }
  }

  const handlePaymentChange = (courseId: string, amount: number) => {
    setSelectedCourses((prev) => prev.map((c) => (c.courseId === courseId ? { ...c, initialPayment: amount } : c)))
  }

  const handleOptionalChange = (lessonTypeId: string, quantity: number, price: number) => {
    if (quantity === 0) {
      setSelectedOptionals((prev) => prev.filter((o) => o.lessonTypeId !== lessonTypeId))
    } else {
      setSelectedOptionals((prev) => {
        const existing = prev.find((o) => o.lessonTypeId === lessonTypeId)
        if (existing) {
          return prev.map((o) => (o.lessonTypeId === lessonTypeId ? { ...o, quantity, price } : o))
        }
        return [...prev, { lessonTypeId, quantity, price }]
      })
    }
  }

  const totalCoursePrice = selectedCourses.reduce((sum, sc) => {
    const course = courses.find((c) => c.id === sc.courseId)
    return sum + (course?.price || 0)
  }, 0)

  const totalInitialPayment = selectedCourses.reduce((sum, sc) => sum + sc.initialPayment, 0)

  const totalOptionalsPrice = selectedOptionals.reduce((sum, so) => sum + so.price * so.quantity, 0)

  const handleSubmit = async () => {
    if (selectedCourses.length === 0) {
      toaster.error({ title: 'Выберите хотя бы один курс' })
      return
    }

    setIsSubmitting(true)

    const result = await enrollStudentToCoursesAction({
      progressId,
      courses: selectedCourses.map((c) => ({
        courseId: c.courseId,
        initialPayment: c.initialPayment,
        paymentMethod: 'CASH',
      })),
    })

    setIsSubmitting(false)

    if (result.success) {
      toaster.success({ title: 'Ученик записан на курс' })
      router.push(`/school/progress/student/${progressId}?schoolId=${schoolId}`)
    } else {
      toaster.error({ title: 'Ошибка', description: result.message })
    }
  }

  if (isLoading) {
    return (
      <HStack justify="center" py={12}>
        <Spinner />
        <Text>Загрузка...</Text>
      </HStack>
    )
  }

  if (!progress) {
    return (
      <VStack py={12}>
        <Text>Ученик не найден</Text>
        <Button asChild variant="outline">
          <Link href={`/school/progress/${schoolId}`}>
            <LuArrowLeft />
            Назад к списку
          </Link>
        </Button>
      </VStack>
    )
  }

  // Категории, на которые уже записан
  const existingCategories = progress.categories.map((c) => c.category)

  return (
    <VStack gap={6} align="stretch">
      {/* Навигация */}
      <HStack justify="space-between">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/school/progress/student/${progressId}?schoolId=${schoolId}`}>
            <LuArrowLeft />
            Назад к ученику
          </Link>
        </Button>
      </HStack>

      {/* Заголовок */}
      <Card.Root>
        <Card.Body>
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <VStack align="start" gap={1}>
              <Text fontSize="xl" fontWeight="semibold">
                Записать на курс
              </Text>
              <Text color="fg.muted">
                {progress.user.name || 'Без имени'} • {progress.user.email || progress.user.phone}
              </Text>
            </VStack>
            <HStack gap={2}>
              {existingCategories.map((cat) => (
                <Badge key={cat} colorPalette="purple">
                  {cat}
                </Badge>
              ))}
            </HStack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Выбор курсов */}
      <CourseSelector
        courses={courses}
        selectedCourses={selectedCourses}
        existingCategories={existingCategories}
        onToggle={handleCourseToggle}
        onPaymentChange={handlePaymentChange}
      />

      {/* Опциональные занятия */}
      {optionalTypes.length > 0 && (
        <OptionalLessonsSelector
          lessonTypes={optionalTypes}
          selectedOptionals={selectedOptionals}
          onChange={handleOptionalChange}
        />
      )}

      {/* Итого */}
      <PaymentSummary
        totalCoursePrice={totalCoursePrice}
        totalInitialPayment={totalInitialPayment}
        totalOptionalsPrice={totalOptionalsPrice}
      />

      {/* Кнопка записи */}
      <HStack justify="flex-end" gap={3}>
        <Button asChild variant="outline">
          <Link href={`/school/progress/student/${progressId}?schoolId=${schoolId}`}>Отмена</Link>
        </Button>
        <Button colorPalette="brand" onClick={handleSubmit} disabled={isSubmitting || selectedCourses.length === 0}>
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              Записываем...
            </>
          ) : (
            <>
              <LuCheck />
              Записать на курс
            </>
          )}
        </Button>
      </HStack>
    </VStack>
  )
}
