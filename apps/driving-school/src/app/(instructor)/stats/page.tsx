import { getSession } from '@/lib/auth'
import { isInstructor } from '@/lib/roles'
import { Box, Container, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import type { PeriodType } from './_actions/stats.action'
import { getInstructorStats } from './_actions/stats.action'
import { ExportButton } from './_components/export-button'
import { PeriodSelector } from './_components/period-selector'
import { StatsCards } from './_components/stats-cards'
import { StatsChartsLazy } from './_components/stats-charts-lazy'

export const metadata = {
  title: 'Статистика',
  description: 'Статистика и отчёты',
}

interface StatsPageProps {
  searchParams: Promise<{ period?: string }>
}

export default async function StatsPage({ searchParams }: StatsPageProps) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/stats')
  }

  if (!isInstructor(session.user.roles)) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const period = (params.period as PeriodType) || 'month'

  const result = await getInstructorStats(period)

  if (!result.success) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack gap={6} align="stretch">
          <Box layerStyle="panel.error" p={6} textAlign="center">
            <Heading size="lg" color="error.fg">
              Ошибка
            </Heading>
            <Text color="error.fg" mt={2}>
              Не удалось загрузить статистику
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  const { stats } = result

  // Форматируем период для отображения
  const periodLabels: Record<PeriodType, string> = {
    week: 'за неделю',
    month: 'за месяц',
    year: 'за год',
    all: 'за всё время',
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <Box>
            <Heading size="xl">Статистика</Heading>
            <Text color="fg.muted" mt={1}>
              Отчёты и аналитика {periodLabels[period]}
            </Text>
          </Box>
          <HStack gap={4} flexWrap="wrap">
            <PeriodSelector currentPeriod={period} />
            <ExportButton period={period} />
          </HStack>
        </HStack>

        {/* Карточки со статистикой */}
        <StatsCards
          lessons={stats.lessons}
          students={stats.students}
          finance={stats.finance}
          lessonTypeStats={stats.lessonTypeStats}
        />

        {/* Графики — ленивая загрузка Recharts */}
        <StatsChartsLazy lessons={stats.lessons} dailyData={stats.dailyData} />
      </VStack>
    </Container>
  )
}
