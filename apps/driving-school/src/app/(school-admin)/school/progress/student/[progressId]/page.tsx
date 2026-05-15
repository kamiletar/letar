'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Avatar, Badge, Button, Card, HStack, Separator, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuClipboardList } from 'react-icons/lu'

import { getStudentProgressByIdAction, type StudentProgressDetails } from '../../_actions/progress.action'
import { DocumentsSectionV2 } from './_components/documents-section-v2'
import { PracticeSection } from './_components/practice-section'
import { ProgressStepper } from './_components/progress-stepper'
import { TheorySection } from './_components/theory-section'

export default function StudentProgressDetailsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const progressId = params.progressId as string
  const schoolId = searchParams.get('schoolId') || ''

  const [progress, setProgress] = useState<StudentProgressDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadProgress = useCallback(async () => {
    setIsLoading(true)
    const result = await getStudentProgressByIdAction(progressId)
    if (result.success) {
      setProgress(result.progress)
    } else {
      toaster.error({ title: 'Ошибка загрузки данных' })
    }
    setIsLoading(false)
  }, [progressId])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

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

  const enrollDate = new Date(progress.enrolledAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <VStack gap={6} align="stretch">
      {/* Навигация */}
      <HStack>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/school/progress/${schoolId}`}>
            <LuArrowLeft />
            Назад
          </Link>
        </Button>
      </HStack>

      {/* Заголовок с информацией ученика */}
      <Card.Root>
        <Card.Body>
          <HStack justify="space-between" wrap="wrap" gap={4}>
            <HStack gap={4}>
              <Avatar.Root size="lg">
                <Avatar.Image src={progress.user.image || undefined} />
                <Avatar.Fallback name={progress.user.name || ''} />
              </Avatar.Root>
              <VStack align="start" gap={1}>
                <Text fontSize="xl" fontWeight="semibold">
                  {progress.user.name || 'Без имени'}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  {progress.user.email} • {progress.user.phone}
                </Text>
                <HStack gap={2}>
                  <Badge colorPalette={progress.status === 'ACTIVE' ? 'green' : 'gray'}>
                    {progress.status === 'ACTIVE' ? 'Активный' : progress.status}
                  </Badge>
                  <Text fontSize="xs" color="fg.muted">
                    с {enrollDate}
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            <HStack gap={3}>
              <Button asChild variant="outline">
                <Link href={`/school/progress/student/${progressId}/enroll?schoolId=${schoolId}`}>
                  <LuClipboardList />
                  Записать на курс
                </Link>
              </Button>
            </HStack>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Прогресс степпер */}
      <ProgressStepper progress={progress} />

      {/* Категории */}
      {progress.categories.length > 0 && (
        <HStack gap={2} wrap="wrap">
          <Text fontWeight="medium">Категории:</Text>
          {progress.categories.map((cat) => (
            <Badge key={cat.id} colorPalette="purple" size="lg">
              {cat.category}
              {cat.transmissionRestriction && ` (${cat.transmissionRestriction === 'AUTOMATIC' ? 'АТ' : 'МТ'})`}
            </Badge>
          ))}
        </HStack>
      )}

      <Separator />

      {/* Секции */}
      <DocumentsSectionV2 progress={progress} canManage={true} onRefresh={loadProgress} />

      <Separator />

      <TheorySection progress={progress} onRefresh={loadProgress} />

      <Separator />

      <PracticeSection progress={progress} onRefresh={loadProgress} />
    </VStack>
  )
}
