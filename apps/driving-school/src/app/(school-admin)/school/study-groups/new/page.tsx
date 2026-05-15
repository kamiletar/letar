'use client'

import { Box, Button, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { LuArrowLeft } from 'react-icons/lu'

import { StudyGroupForm } from '../_components/study-group-form'

function NewStudyGroupPageContent() {
  const searchParams = useSearchParams()
  const schoolId = searchParams.get('schoolId')

  if (!schoolId) {
    return (
      <VStack py={12}>
        <Text color="fg.muted">Школа не выбрана</Text>
        <Button asChild variant="ghost">
          <Link href="/school/stats">
            <LuArrowLeft />
            Назад к выбору школы
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
          <Link href={`/school/study-groups?schoolId=${schoolId}`}>
            <LuArrowLeft />
            Назад
          </Link>
        </Button>
        <Box>
          <Heading size="lg">Создание учебной группы</Heading>
          <Text color="fg.muted" fontSize="sm">
            Заполните информацию о новой группе
          </Text>
        </Box>
      </HStack>

      {/* Форма */}
      <StudyGroupForm schoolId={schoolId} />
    </VStack>
  )
}

export default function NewStudyGroupPage() {
  return (
    <Suspense
      fallback={
        <HStack justify="center" py={12}>
          <Spinner />
          <Text>Загрузка...</Text>
        </HStack>
      }
    >
      <NewStudyGroupPageContent />
    </Suspense>
  )
}
