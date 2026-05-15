import { Container, Heading, Text, VStack } from '@chakra-ui/react'
import { getExamSessionsAction } from './_actions/exam.action'
import { ExamSessionsList } from './_components/exam-sessions-list'

export const metadata = {
  title: 'Экзамены',
}

export default async function ExamsPage() {
  const result = await getExamSessionsAction()

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
        <Heading size="lg">Экзамены</Heading>

        {result.sessions && result.sessions.length > 0 ? (
          <ExamSessionsList sessions={result.sessions} />
        ) : (
          <Text color="fg.muted">Нет запланированных экзаменов</Text>
        )}
      </VStack>
    </Container>
  )
}
