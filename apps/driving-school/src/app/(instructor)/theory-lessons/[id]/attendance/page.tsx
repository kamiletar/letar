import { Badge, Box, Button, Container, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuArrowLeft, LuCalendar, LuClock, LuMapPin } from 'react-icons/lu'
import { getTheoryLessonWithAttendance } from '../../_actions/theory-lesson.action'
import { AttendanceForm } from './_components/attendance-form'

export const metadata = {
  title: 'Посещаемость занятия',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AttendancePage({ params }: PageProps) {
  const { id } = await params
  const result = await getTheoryLessonWithAttendance(id)

  if (!result.success || !result.lesson) {
    return (
      <Container py={8}>
        <Text color="error.solid">{result.error || 'Занятие не найдено'}</Text>
      </Container>
    )
  }

  const { lesson, attendance } = result
  const scheduledAt = new Date(lesson.scheduledAt)

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
          <Link href="/theory-lessons">
            <Icon>
              <LuArrowLeft />
            </Icon>
            Назад к занятиям
          </Link>
        </Button>

        {/* Информация о занятии */}
        <Box bg="bg.panel" p={6} borderRadius="lg" borderWidth="1px">
          <VStack align="stretch" gap={4}>
            <Heading size="md">{lesson.topic.name}</Heading>

            <Badge colorPalette="brand" alignSelf="flex-start">
              {lesson.group.name}
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
              {lesson.location && (
                <HStack gap={2}>
                  <Icon>
                    <LuMapPin />
                  </Icon>
                  <Text>{lesson.location}</Text>
                </HStack>
              )}
            </HStack>
          </VStack>
        </Box>

        {/* Форма посещаемости */}
        <Heading size="md">Отметить присутствующих</Heading>

        {attendance && attendance.length > 0 ? (
          <AttendanceForm lessonId={id} initialAttendance={attendance} />
        ) : (
          <Text color="fg.muted">В группе нет учеников</Text>
        )}
      </VStack>
    </Container>
  )
}
