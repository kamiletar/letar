import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { notFound, redirect } from 'next/navigation'
import { getLessonType } from '../../_actions/lesson-type.action'
import { LessonTypeForm } from '../../_components/lesson-type-form'

export const metadata = {
  title: 'Редактирование типа занятия',
  description: 'Изменение параметров типа занятия',
}

interface EditLessonTypePageProps {
  params: Promise<{ id: string }>
}

export default async function EditLessonTypePage({ params }: EditLessonTypePageProps) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/lesson-types')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const { id } = await params
  const result = await getLessonType(id)

  if (!result.success) {
    if (result.error === 'NOT_FOUND') {
      notFound()
    }
    return (
      <Container maxW="container.md" py={8}>
        <Box layerStyle="panel.error" p={6} textAlign="center">
          <Heading size="lg" color="error.fg">
            Ошибка
          </Heading>
          <Text color="error.fg" mt={2}>
            Не удалось загрузить тип занятия
          </Text>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box>
          <Heading size="xl">Редактирование типа занятия</Heading>
          <Text color="fg.muted" mt={2}>
            Измените параметры типа занятия
          </Text>
        </Box>

        {/* Форма */}
        <Box bg="bg.panel" p={6} borderRadius="lg" borderWidth="1px">
          <LessonTypeForm defaultValues={result.lessonType} submitLabel="Сохранить" />
        </Box>

        {/* Статистика */}
        <Box bg="bg.subtle" p={4} borderRadius="lg">
          <Text fontSize="sm" color="fg.muted">
            Проведено занятий с этим типом: <strong>{result.lessonType._count.lessons}</strong>
          </Text>
        </Box>
      </VStack>
    </Container>
  )
}
