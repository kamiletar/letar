import { InstructorHeader } from '@/app/(instructor)/_components/instructor-header'
import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Button, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuCalendar, LuSettings } from 'react-icons/lu'
import { getInstructorSchedule } from './_actions/schedule.action'
import { ScheduleView } from './_components/schedule-view'

export const metadata = {
  title: 'Расписание',
  description: 'Расписание занятий инструктора',
}

export default async function SchedulePage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/schedule')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const result = await getInstructorSchedule()

  if (!result.success) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch">
          <InstructorHeader />

          <Box layerStyle="panel.error" p={6} textAlign="center">
            <Heading size="lg" color="error.fg">
              Ошибка
            </Heading>
            <Text color="error.fg" mt={2}>
              {result.error === 'NO_PROFILE'
                ? 'Профиль инструктора не найден. Заполните профиль.'
                : 'Не удалось загрузить расписание.'}
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        <InstructorHeader />

        {/* Заголовок */}
        <HStack justify="space-between" wrap="wrap" gap={4}>
          <Box>
            <Heading size="xl">Расписание</Heading>
            <Text color="fg.muted" mt={2}>
              Управление слотами и занятиями
            </Text>
          </Box>
          <Button asChild variant="outline">
            <Link href="/schedule/settings">
              <LuSettings size={16} />
              Настройки расписания
            </Link>
          </Button>
        </HStack>

        {/* Предупреждение, если нет настроек */}
        {!result.hasSettings && (
          <Box layerStyle="panel.warning" p={4}>
            <HStack gap={3}>
              <LuCalendar size={20} />
              <Box flex={1}>
                <Text fontWeight="semibold" color="warning.fg">
                  Настройки расписания не заданы
                </Text>
                <Text fontSize="sm" color="warning.fg">
                  Настройте рабочие часы, чтобы система автоматически генерировала слоты.
                </Text>
              </Box>
              <Button asChild size="sm" colorPalette="warning" variant="solid">
                <Link href="/schedule/settings">Настроить</Link>
              </Button>
            </HStack>
          </Box>
        )}

        {/* Интерактивное расписание с горизонтальным выбором даты */}
        <ScheduleView slots={result.slots} />
      </VStack>
    </Container>
  )
}
