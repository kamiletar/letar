'use client'

import { Button, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuBookOpen } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import type { TheoryTopicDetails } from '../../_actions/theory-topic.action'
import { getTheoryTopicAction } from '../../_actions/theory-topic.action'
import { TheoryTopicForm } from '../../_components/theory-topic-form'

function TheoryTopicDetailPageContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const topicId = params.id as string
  const schoolId = searchParams.get('schoolId')

  const [topic, setTopic] = useState<TheoryTopicDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadTopic = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getTheoryTopicAction(topicId)
      if (result.success && result.topic) {
        setTopic(result.topic)
      } else {
        toaster.error({
          title: 'Ошибка',
          description: 'Не удалось загрузить тему',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [topicId])

  useEffect(() => {
    loadTopic()
  }, [loadTopic])

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
        <Text>Загрузка темы...</Text>
      </HStack>
    )
  }

  if (!topic) {
    return (
      <VStack py={12}>
        <Text color="fg.muted">Тема не найдена</Text>
        <Button asChild variant="ghost">
          <Link href={`/school/theory-topics/${schoolId}`}>
            <LuArrowLeft />
            Назад к списку тем
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
          <Link href={`/school/theory-topics/${schoolId}`}>
            <LuArrowLeft />
            Назад
          </Link>
        </Button>
        <HStack gap={2}>
          <LuBookOpen />
          <Heading size="lg">Редактирование темы</Heading>
        </HStack>
      </HStack>

      {/* Форма */}
      <TheoryTopicForm schoolId={schoolId} topic={topic} />
    </VStack>
  )
}

export default function TheoryTopicDetailPage() {
  return (
    <Suspense
      fallback={
        <HStack justify="center" py={12}>
          <Spinner />
          <Text>Загрузка...</Text>
        </HStack>
      }
    >
      <TheoryTopicDetailPageContent />
    </Suspense>
  )
}
