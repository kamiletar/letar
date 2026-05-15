import { Badge, Box, Button, Container, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuArrowLeft, LuCalendar, LuClock, LuMapPin } from 'react-icons/lu'
import { getExamSessionWithRegistrations } from '../../_actions/exam.action'
import { EXAM_TYPE_LABELS } from '../../_constants/exam-types'
import { ExamResultsForm } from './_components/exam-results-form'

export const metadata = {
  title: 'Результаты экзамена',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ExamResultsPage({ params }: PageProps) {
  const { id } = await params
  const result = await getExamSessionWithRegistrations(id)

  if (!result.success || !result.session) {
    return (
      <Container py={8}>
        <Text color="error.solid">{result.error || 'Экзамен не найден'}</Text>
      </Container>
    )
  }

  const { session } = result
  const scheduledAt = new Date(session.scheduledAt)

  const dateStr = scheduledAt.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const timeStr = scheduledAt.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Container py={8} maxW="container.md">
      <VStack align="stretch" gap={6}>
        {/* Назад */}
        <Button asChild variant="ghost" size="sm" alignSelf="flex-start">
          <Link href="/exams">
            <Icon>
              <LuArrowLeft />
            </Icon>
            Назад к экзаменам
          </Link>
        </Button>

        {/* Информация об экзамене */}
        <Box bg="bg.panel" p={6} borderRadius="lg" borderWidth="1px">
          <VStack align="stretch" gap={4}>
            <Heading size="md">{EXAM_TYPE_LABELS[session.type] || session.type}</Heading>

            <Badge colorPalette="purple" alignSelf="flex-start">
              Категория {session.category}
            </Badge>

            <HStack gap={6} color="fg.muted" wrap="wrap">
              <HStack gap={2}>
                <Icon>
                  <LuCalendar />
                </Icon>
                <Text>{dateStr}</Text>
              </HStack>
              <HStack gap={2}>
                <Icon>
                  <LuClock />
                </Icon>
                <Text>{timeStr}</Text>
              </HStack>
              {session.location && (
                <HStack gap={2}>
                  <Icon>
                    <LuMapPin />
                  </Icon>
                  <Text>{session.location}</Text>
                </HStack>
              )}
            </HStack>
          </VStack>
        </Box>

        {/* Форма результатов */}
        <Heading size="md">Результаты экзамена</Heading>

        {session.registrations && session.registrations.length > 0 ? (
          <ExamResultsForm sessionId={id} registrations={session.registrations} />
        ) : (
          <Text color="fg.muted">Нет записавшихся на экзамен</Text>
        )}
      </VStack>
    </Container>
  )
}
