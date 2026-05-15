import { getSpecialistStats } from '@/app/(specialist)/_actions/analytics.actions'
import { DashboardStats } from '@/app/(specialist)/_components/dashboard-stats'
import { getAdminStats } from '@/app/_actions/admin-analytics.actions'
import { AdminDashboardStats } from '@/app/_components/admin-dashboard-stats'
import { getSession } from '@/lib/auth'
import { Box, Container, Heading, Skeleton, Stack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

/**
 * КОМПОНЕНТ ДЛЯ ЗАГРУЗКИ СТАТИСТИКИ СПЕЦИАЛИСТА
 */
async function SpecialistStatsLoader() {
  const stats = await getSpecialistStats()
  return <DashboardStats stats={stats} />
}

/**
 * КОМПОНЕНТ ДЛЯ ЗАГРУЗКИ СТАТИСТИКИ АДМИНИСТРАТОРА
 */
async function AdminStatsLoader() {
  const stats = await getAdminStats()
  return <AdminDashboardStats stats={stats} />
}

/**
 * СКЕЛЕТОН ДЛЯ ЗАГРУЗКИ
 */
function StatsSkeleton() {
  return (
    <Stack gap={6}>
      <Skeleton height="120px" />
      <Stack direction="row" gap={4}>
        <Skeleton height="200px" flex={1} />
        <Skeleton height="200px" flex={1} />
      </Stack>
      <Stack direction="row" gap={4}>
        <Skeleton height="300px" flex={1} />
        <Skeleton height="300px" flex={1} />
      </Stack>
    </Stack>
  )
}

/**
 * СТРАНИЦА АНАЛИТИКИ
 * Отображает статистику в зависимости от роли пользователя:
 * - SPECIALIST: статистика по своим клиентам
 * - ADMIN: статистика по всей системе
 */
export default async function AnalyticsPage() {
  const session = await getSession()

  // Если пользователь не авторизован, редирект на страницу входа
  if (!session?.user) {
    redirect('/sign-in')
  }

  const { role } = session.user

  // Проверка доступа - только SPECIALIST и ADMIN
  if (role !== 'SPECIALIST' && role !== 'ADMIN') {
    redirect('/dashboard')
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Box mb={8}>
        <Heading size="2xl" mb={2}>
          Аналитика
        </Heading>
        <Heading size="sm" fontWeight="normal" color="gray.600">
          {role === 'ADMIN' ? 'Статистика и метрики всей системы' : 'Статистика и метрики вашей работы'}
        </Heading>
      </Box>

      <Suspense fallback={<StatsSkeleton />}>
        {role === 'ADMIN' ? <AdminStatsLoader /> : <SpecialistStatsLoader />}
      </Suspense>
    </Container>
  )
}
