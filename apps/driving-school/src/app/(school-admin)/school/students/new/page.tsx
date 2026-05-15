'use client'

import { Button, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { LuArrowLeft, LuUserPlus } from 'react-icons/lu'

import { CreateStudentForm } from '../_components/create-student-form'

function NewStudentPageContent() {
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
          <Link href={`/school/${schoolId}/students`}>
            <LuArrowLeft />
            Назад
          </Link>
        </Button>
        <HStack gap={2}>
          <LuUserPlus />
          <Heading size="lg">Новый ученик</Heading>
        </HStack>
      </HStack>

      {/* Форма */}
      <CreateStudentForm organizationId={schoolId} />
    </VStack>
  )
}

export default function NewStudentPage() {
  return (
    <Suspense
      fallback={
        <HStack justify="center" py={12}>
          <Spinner />
          <Text>Загрузка...</Text>
        </HStack>
      }
    >
      <NewStudentPageContent />
    </Suspense>
  )
}
