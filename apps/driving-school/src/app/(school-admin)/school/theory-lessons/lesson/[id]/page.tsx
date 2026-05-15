'use client'

import { Button, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuCalendar } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import type { TheoryLessonDetails } from '../../_actions/theory-lesson.action'
import { getTheoryLessonAction } from '../../_actions/theory-lesson.action'
import { TheoryLessonForm } from '../../_components/theory-lesson-form'

function TheoryLessonDetailPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const lessonId = params.id as string
  const schoolId = searchParams.get('schoolId')

  const [lesson, setLesson] = useState<TheoryLessonDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadLesson = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getTheoryLessonAction(lessonId)
      if (result.success && result.lesson) {
        setLesson(result.lesson)
      } else {
        toaster.error({
          title: 'Ошибка',
          description: 'Не удалось загрузить занятие',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    loadLesson()
  }, [loadLesson])

  if (!schoolId) {
    return (
      <VStack py={12}>
        <Text color="fg.muted">Школа не указана</Text>
        <Button asChild variant="ghost">
          <Link href="/school/stats">
            <LuArrowLeft />
            Назад
          </Link>
        </Button>
      </VStack>
    )
  }

  if (isLoading) {
    return (
      <HStack justify="center" py={12}>
        <Spinner />
        <Text>Загрузка занятия...</Text>
      </HStack>
    )
  }

  if (!lesson) {
    return (
      <VStack py={12}>
        <Text color="fg.muted">Занятие не найдено</Text>
        <Button asChild variant="ghost">
          <Link href={`/school/theory-lessons/${schoolId}`}>
            <LuArrowLeft />
            Назад к списку занятий
          </Link>
        </Button>
      </VStack>
    )
  }

  // Проверяем, можно ли редактировать занятие
  if (lesson.status !== 'SCHEDULED') {
    return (
      <VStack py={12}>
        <Text color="fg.muted">
          {lesson.status === 'CANCELLED' && 'Занятие отменено и не может быть отредактировано'}
          {lesson.status === 'RESCHEDULED' && 'Занятие перенесено и не может быть отредактировано'}
          {lesson.status === 'COMPLETED' && 'Занятие завершено и не может быть отредактировано'}
          {lesson.status === 'IN_PROGRESS' && 'Занятие уже идёт и не может быть отредактировано'}
        </Text>
        <Button asChild variant="ghost">
          <Link href={`/school/theory-lessons/${schoolId}`}>
            <LuArrowLeft />
            Назад к списку занятий
          </Link>
        </Button>
      </VStack>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <HStack gap={4}>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/school/theory-lessons/${schoolId}`}>
            <LuArrowLeft />
            Назад
          </Link>
        </Button>
        <HStack gap={2}>
          <LuCalendar />
          <Heading size="lg">Редактирование занятия</Heading>
        </HStack>
      </HStack>

      {/* Форма */}
      <TheoryLessonForm schoolId={schoolId} lesson={lesson} />
    </VStack>
  )
}

export default function TheoryLessonDetailPage() {
  return (
    <Suspense
      fallback={
        <HStack justify="center" py={12}>
          <Spinner />
          <Text>Загрузка...</Text>
        </HStack>
      }
    >
      <TheoryLessonDetailPageContent />
    </Suspense>
  )
}
