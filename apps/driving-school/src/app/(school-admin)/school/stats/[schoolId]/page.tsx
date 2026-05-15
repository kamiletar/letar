import { PeriodSelector } from '@/app/(instructor)/stats/_components/period-selector'
import { getSession } from '@/lib/auth'
import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import type { PeriodType } from '../_actions/school-stats.action'
import { getSchoolStats } from '../_actions/school-stats.action'
import { InstructorsTable } from '../_components/instructors-table'
import { SchoolStatsCards } from '../_components/school-stats-cards'

export const metadata = {
  title: 'Статистика школы',
  description: 'Статистика и отчёты автошколы',
}

interface SchoolStatsPageProps {
  params: Promise<{ schoolId: string }>
  searchParams: Promise<{ period?: string }>
}

export default async function SchoolStatsPage({ params, searchParams }: SchoolStatsPageProps) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId } = await params
  const { period: periodParam } = await searchParams
  const period = (periodParam as PeriodType) || 'month'

  const result = await getSchoolStats(schoolId, period)

  if (!result.success) {
    const errorMessages: Record<string, string> = {
      UNAUTHORIZED: 'Необходимо войти в систему',
      NOT_SCHOOL_ADMIN: 'Нет доступа к этой школе',
      NO_SCHOOL: 'Школа не найдена',
      UNKNOWN_ERROR: 'Произошла ошибка',
    }

    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Ошибка
        </Heading>
        <Text color="error.fg" mt={2}>
          {errorMessages[result.error]}
        </Text>
      </Box>
    )
  }

  const { stats } = result

  const periodLabels: Record<PeriodType, string> = {
    week: 'за неделю',
    month: 'за месяц',
    year: 'за год',
    all: 'за всё время',
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Период и селектор */}
      <HStack justify="space-between" flexWrap="wrap" gap={4}>
        <Text color="fg.muted">Статистика {periodLabels[period]}</Text>
        <PeriodSelector currentPeriod={period} />
      </HStack>

      {/* Карточки статистики */}
      <SchoolStatsCards members={stats.members} lessons={stats.lessons} />

      {/* Таблица инструкторов */}
      <InstructorsTable instructors={stats.instructors} />
    </VStack>
  )
}
