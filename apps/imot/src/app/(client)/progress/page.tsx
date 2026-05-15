import { getClientDashboardStats, getLevelProgressHistory } from '@/app/_actions/client-dashboard.actions'
import { Box, Button, Container, Heading, Skeleton, Stack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { Suspense } from 'react'
import { LuDownload, LuTrendingUp } from 'react-icons/lu'
import { ClientDashboardStatsDisplay } from '../_components/client-dashboard-stats'
import { LevelProgressCharts } from '../_components/level-progress-chart'
import { ResultsTimeline } from './_components'

/**
 * КОМПОНЕНТ ДЛЯ ЗАГРУЗКИ ДАШБОРДА
 */
async function DashboardLoader() {
  try {
    const stats = await getClientDashboardStats()
    return <ClientDashboardStatsDisplay stats={stats} />
  } catch {
    // Если клиент не найден
    return (
      <Box p={8} borderWidth="1px" borderRadius="lg" borderColor="border" textAlign="center">
        <LuTrendingUp size={48} style={{ margin: '0 auto 16px' }} />
        <Text fontSize="lg" fontWeight="medium" mb={2}>
          Профиль клиента не найден
        </Text>
        <Text color="fg.muted">Ваш профиль клиента еще не создан. Пожалуйста, обратитесь к вашему специалисту.</Text>
      </Box>
    )
  }
}

/**
 * КОМПОНЕНТ ДЛЯ ЗАГРУЗКИ ГРАФИКОВ
 */
async function ChartsLoader() {
  try {
    // Получаем историю прогресса за последние 90 дней
    const histories = await getLevelProgressHistory(undefined, undefined, 90)

    if (histories.length === 0) {
      return (
        <Box p={8} borderWidth="1px" borderRadius="lg" borderColor="border" textAlign="center">
          <Text fontSize="lg" fontWeight="medium" mb={2}>
            Результаты еще не зафиксированы
          </Text>
          <Text color="fg.muted">
            Ваш специалист будет периодически фиксировать изменения в процессе трансформации. Здесь вы сможете
            отслеживать динамику по каждому уровню ИМОТ и видеть свой прогресс в реальном времени.
          </Text>
        </Box>
      )
    }

    return <LevelProgressCharts histories={histories} />
  } catch {
    return null
  }
}

/**
 * КОМПОНЕНТ ДЛЯ ЗАГРУЗКИ ИСТОРИИ
 */
async function TimelineLoader() {
  try {
    const stats = await getClientDashboardStats()

    if (stats.results.total === 0) {
      return null
    }

    // Получаем историю для таймлайна
    const histories = await getLevelProgressHistory(undefined, undefined, 30)

    // Преобразуем histories в формат results для ResultsTimeline
    const results = histories.flatMap((history) =>
      history.data.map((point) => ({
        id: `${history.level}-${history.metric}-${point.date.getTime()}`,
        level: history.level,
        metric: history.metric,
        value: point.value,
        measuredAt: point.date,
        description: null,
        notes: null,
        clientId: '',
        practiceId: null,
        createdAt: point.date,
        updatedAt: point.date,
      }))
    )

    // Сортируем по дате (новые сначала)
    results.sort((a, b) => b.measuredAt.getTime() - a.measuredAt.getTime())

    return <ResultsTimeline results={results} />
  } catch {
    return null
  }
}

/**
 * СКЕЛЕТОНЫ ДЛЯ ЗАГРУЗКИ
 */
function DashboardSkeleton() {
  return (
    <Stack gap={6}>
      <Skeleton height="120px" />
      <Stack direction="row" gap={4}>
        <Skeleton height="200px" flex={1} />
        <Skeleton height="200px" flex={1} />
      </Stack>
    </Stack>
  )
}

function ChartsSkeleton() {
  return (
    <Stack gap={4}>
      <Skeleton height="300px" />
      <Skeleton height="300px" />
    </Stack>
  )
}

/**
 * Страница "Прогресс" для клиентов
 * Отображает дашборд, графики прогресса и историю изменений
 */
export default function ProgressPage() {
  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Заголовок */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Heading size="2xl" textTransform="none" mb={2}>
              Прогресс
            </Heading>
            <Text color="fg.muted" fontSize="lg">
              Отслеживание вашей трансформации по всем уровням ИМОТ
            </Text>
          </Box>
          <Button asChild colorPalette="fg" size="lg">
            <Link
              href="/api/pdf/client-results"
              target="_blank"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <LuDownload />
              Скачать PDF
            </Link>
          </Button>
        </Box>

        {/* Дашборд со статистикой */}
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardLoader />
        </Suspense>

        {/* Графики прогресса по времени */}
        <Box>
          <Text fontSize="xl" fontWeight="medium" mb={4}>
            Графики прогресса
          </Text>
          <Suspense fallback={<ChartsSkeleton />}>
            <ChartsLoader />
          </Suspense>
        </Box>

        {/* История изменений */}
        <Box>
          <Text fontSize="xl" fontWeight="medium" mb={4}>
            История изменений
          </Text>
          <Suspense fallback={<Skeleton height="200px" />}>
            <TimelineLoader />
          </Suspense>
        </Box>
      </VStack>
    </Container>
  )
}
