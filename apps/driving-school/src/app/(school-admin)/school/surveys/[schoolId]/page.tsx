import { Badge, Box, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'

import { getNpsMetricsAction, getSurveysAction } from '../_actions/survey.action'

import { SurveysPageClient } from './_components/surveys-page-client'

export const metadata = {
  title: 'NPS Опросы',
  description: 'Управление опросами и обратная связь от учеников',
}

interface SurveysPageProps {
  params: Promise<{ schoolId: string }>
}

/**
 * Цвет NPS
 */
function getNpsColor(score: number | null): string {
  if (score === null) {
    return 'gray'
  }
  if (score >= 50) {
    return 'green'
  }
  if (score >= 0) {
    return 'yellow'
  }
  return 'red'
}

export default async function SurveysPage({ params }: SurveysPageProps) {
  const { schoolId } = await params

  // Загружаем данные параллельно
  const [surveysResult, metricsResult] = await Promise.all([getSurveysAction(schoolId), getNpsMetricsAction(schoolId)])

  if (!surveysResult.success) {
    if (surveysResult.error.includes('доступ')) {
      notFound()
    }
    return (
      <Box p={6}>
        <Text color="fg.error">{surveysResult.error}</Text>
      </Box>
    )
  }

  const surveys = surveysResult.data
  const metrics = metricsResult.success ? metricsResult.data : null

  return (
    <VStack align="stretch" gap={6} p={{ base: 4, md: 6 }}>
      {/* Заголовок */}
      <Box>
        <Heading size="lg">NPS Опросы</Heading>
        <Text color="fg.muted" mt={1}>
          Сбор обратной связи и измерение лояльности учеников
        </Text>
      </Box>

      {/* NPS метрики */}
      {metrics && (
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
          {/* NPS Score */}
          <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" p={4}>
            <Text fontSize="sm" color="fg.muted" mb={2}>
              NPS Score
            </Text>
            <HStack gap={2}>
              <Badge colorPalette={getNpsColor(metrics.score)} size="lg">
                {metrics.score !== null ? (metrics.score > 0 ? `+${metrics.score}` : metrics.score) : '—'}
              </Badge>
              <Text fontSize="xs" color="fg.muted">
                от -100 до +100
              </Text>
            </HStack>
          </Box>

          {/* Промоутеры */}
          <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" p={4}>
            <Text fontSize="sm" color="fg.muted" mb={2}>
              Промоутеры (9-10)
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="green.fg">
              {metrics.promoters}
            </Text>
          </Box>

          {/* Нейтральные */}
          <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" p={4}>
            <Text fontSize="sm" color="fg.muted" mb={2}>
              Нейтральные (7-8)
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="yellow.fg">
              {metrics.passives}
            </Text>
          </Box>

          {/* Критики */}
          <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" p={4}>
            <Text fontSize="sm" color="fg.muted" mb={2}>
              Критики (0-6)
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="red.fg">
              {metrics.detractors}
            </Text>
          </Box>
        </SimpleGrid>
      )}

      {/* Список опросов */}
      <SurveysPageClient surveys={surveys} organizationId={schoolId} />
    </VStack>
  )
}
