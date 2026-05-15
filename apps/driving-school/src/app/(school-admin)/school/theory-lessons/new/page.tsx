'use client'

import { Button, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { LuArrowLeft, LuCalendar } from 'react-icons/lu'

import { TheoryLessonForm } from '../_components/theory-lesson-form'

function NewTheoryLessonPageContent() {
  const searchParams = useSearchParams()
  const schoolId = searchParams.get('schoolId')
  const groupId = searchParams.get('groupId')

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

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <HStack gap={4}>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/school/theory-lessons?schoolId=${schoolId}`}>
            <LuArrowLeft />
            Назад
          </Link>
        </Button>
        <HStack gap={2}>
          <LuCalendar />
          <Heading size="lg">Новое занятие</Heading>
        </HStack>
      </HStack>

      {/* Форма */}
      <TheoryLessonForm schoolId={schoolId} groupId={groupId || undefined} />
    </VStack>
  )
}

export default function NewTheoryLessonPage() {
  return (
    <Suspense
      fallback={
        <HStack justify="center" py={12}>
          <Spinner />
          <Text>Загрузка...</Text>
        </HStack>
      }
    >
      <NewTheoryLessonPageContent />
    </Suspense>
  )
}
