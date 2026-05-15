import { Box, Grid, GridItem, Heading, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'

import {
  getInstructorAnalyticsAction,
  getInstructorLeaderboardAction,
} from '../../_actions/instructor-analytics.action'

import { InstructorAnalyticsTable } from './_components/instructor-analytics-table'
import { InstructorKpiCards } from './_components/instructor-kpi-cards'
import { InstructorLeaderboard } from './_components/instructor-leaderboard'

export const metadata = {
  title: 'Аналитика инструкторов',
  description: 'Статистика и рейтинги инструкторов автошколы',
}

interface InstructorAnalyticsPageProps {
  params: Promise<{ id: string }>
}

export default async function InstructorAnalyticsPage({ params }: InstructorAnalyticsPageProps) {
  const { id: schoolId } = await params

  // Загружаем данные параллельно
  const [analyticsResult, leaderboardResult] = await Promise.all([
    getInstructorAnalyticsAction(schoolId),
    getInstructorLeaderboardAction(schoolId, 5),
  ])

  if (!analyticsResult.success) {
    if (analyticsResult.error === 'Нет доступа к аналитике этой школы') {
      notFound()
    }
    return (
      <Box p={6}>
        <Text color="fg.error">{analyticsResult.error}</Text>
      </Box>
    )
  }

  const { instructors, summary } = analyticsResult.data
  const leaderboard = leaderboardResult.success ? leaderboardResult.data : []

  return (
    <VStack align="stretch" gap={6} p={{ base: 4, md: 6 }}>
      {/* Заголовок */}
      <Box>
        <Heading size="lg">Аналитика инструкторов</Heading>
        <Text color="fg.muted" mt={1}>
          Статистика качества обучения и рейтинги инструкторов
        </Text>
      </Box>

      {/* KPI карточки */}
      <InstructorKpiCards summary={summary} />

      {/* Основной контент: таблица + лидерборд */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 320px' }} gap={6}>
        {/* Таблица */}
        <GridItem>
          <VStack align="stretch" gap={4}>
            <Heading size="md">Детальная статистика</Heading>
            <InstructorAnalyticsTable instructors={instructors} />
          </VStack>
        </GridItem>

        {/* Лидерборд */}
        <GridItem>
          <InstructorLeaderboard instructors={leaderboard} />
        </GridItem>
      </Grid>
    </VStack>
  )
}
