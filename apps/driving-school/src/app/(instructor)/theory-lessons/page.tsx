import { Container, Heading, Text, VStack } from '@chakra-ui/react'
import { getTheoryLessonsAction } from './_actions/theory-lesson.action'
import { TheoryLessonsList } from './_components/theory-lessons-list'

export const metadata = {
  title: 'Теоретические занятия',
}

export default async function TheoryLessonsPage() {
  const result = await getTheoryLessonsAction()

  if (!result.success) {
    return (
      <Container py={8}>
        <Text color="error.solid">{result.error}</Text>
      </Container>
    )
  }

  return (
    <Container py={8} maxW="container.xl">
      <VStack align="stretch" gap={6}>
        <Heading size="lg">Теоретические занятия</Heading>

        {result.lessons && result.lessons.length > 0 ? (
          <TheoryLessonsList lessons={result.lessons} />
        ) : (
          <Text color="fg.muted">Нет теоретических занятий</Text>
        )}
      </VStack>
    </Container>
  )
}
