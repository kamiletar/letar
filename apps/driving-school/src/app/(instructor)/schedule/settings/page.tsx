import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { LogoutButton } from '@/app/dashboard/_components/logout-button'
import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Button, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuCalendar, LuHouse } from 'react-icons/lu'
import { getAbsences } from './_actions/absences.action'
import { getCustomBreaks } from './_actions/custom-breaks.action'
import { getScheduleSettings, getSlotsStats } from './_actions/schedule-settings.action'
import { ScheduleSettingsClient } from './_components/schedule-settings-client'

// Дефолтный горизонт планирования
const DEFAULT_PLANNING_HORIZON = 7

export const metadata = {
  title: 'Настройки расписания',
  description: 'Управление рабочим временем и параметрами занятий',
}

export default async function ScheduleSettingsPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/schedule/settings')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const [result, customBreaks, slotsStats, absencesResult] = await Promise.all([
    getScheduleSettings(),
    getCustomBreaks(),
    getSlotsStats(),
    getAbsences(),
  ])

  if (!result.success) {
    return (
      <Container maxW="container.md" py={8}>
        <VStack gap={6} align="stretch">
          <Box layerStyle="panel.error" p={6} textAlign="center">
            <Heading size="lg" color="error.fg">
              Ошибка
            </Heading>
            <Text color="error.fg" mt={2}>
              {result.error === 'NO_PROFILE'
                ? 'Профиль инструктора не найден. Заполните профиль.'
                : 'Не удалось загрузить настройки расписания.'}
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.md" py={8}>
      <VStack gap={6} align="stretch">
        {/* Хедер с навигацией */}
        <HStack justify="space-between">
          <HStack gap={2}>
            <Button asChild variant="ghost" size="sm">
              <Link href="/schedule">
                <LuCalendar />К расписанию
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <LuHouse />В личный кабинет
              </Link>
            </Button>
          </HStack>
          <HStack gap={2}>
            <ColorModeButton />
            <LogoutButton />
          </HStack>
        </HStack>

        <Box>
          <Heading size="xl">Настройки расписания</Heading>
          <Text color="fg.muted" mt={2}>
            Настройте рабочие часы и параметры занятий
          </Text>
        </Box>

        {/* Клиентский компонент с отслеживанием dirty state */}
        <ScheduleSettingsClient
          settings={result.settings}
          customBreaks={customBreaks}
          slotsStats={slotsStats}
          defaultPlanningHorizon={DEFAULT_PLANNING_HORIZON}
          absences={absencesResult.success ? absencesResult.absences : []}
        />
      </VStack>
    </Container>
  )
}
