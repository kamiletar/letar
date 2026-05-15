'use client'

import { Button, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { LuArrowLeft, LuBookOpen } from 'react-icons/lu'

import { TheoryTopicForm } from '../_components/theory-topic-form'

function NewTheoryTopicPageContent() {
  const searchParams = useSearchParams()
  const schoolId = searchParams.get('schoolId')

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
          <Link href={`/school/theory-topics?schoolId=${schoolId}`}>
            <LuArrowLeft />
            Назад
          </Link>
        </Button>
        <HStack gap={2}>
          <LuBookOpen />
          <Heading size="lg">Новая тема</Heading>
        </HStack>
      </HStack>

      {/* Форма */}
      <TheoryTopicForm schoolId={schoolId} />
    </VStack>
  )
}

export default function NewTheoryTopicPage() {
  return (
    <Suspense
      fallback={
        <HStack justify="center" py={12}>
          <Spinner />
          <Text>Загрузка...</Text>
        </HStack>
      }
    >
      <NewTheoryTopicPageContent />
    </Suspense>
  )
}
