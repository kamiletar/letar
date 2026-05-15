import { getSession } from '@/lib/auth'
import { Box, Container, Heading, Skeleton, Stack, Text } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

// Actions
import { getSpecialistStats } from '@/app/(specialist)/_actions/analytics.actions'
import { getAdminDashboardStats } from '@/app/_actions/admin-dashboard.actions'
import { getClientDashboardStats } from '@/app/_actions/client-dashboard.actions'

// Components
import { ClientDashboardStatsDisplay } from '@/app/(client)/_components/client-dashboard-stats'
import { AdminDashboardStats } from '@/app/(dashboard)/_components/admin-dashboard-stats'
import { DashboardStats as SpecialistDashboardStats } from '@/app/(specialist)/_components/dashboard-stats'

/**
 * КОМПОНЕНТ ДЛЯ ЗАГРУЗКИ СТАТИСТИКИ КЛИЕНТА
 */
async function ClientDashboardLoader() {
  const stats = await getClientDashboardStats()
  return <ClientDashboardStatsDisplay stats={stats} />
}

/**
 * КОМПОНЕНТ ДЛЯ ЗАГРУЗКИ СТАТИСТИКИ СПЕЦИАЛИСТА
 */
async function SpecialistDashboardLoader() {
  const stats = await getSpecialistStats()
  return <SpecialistDashboardStats stats={stats} />
}

/**
 * КОМПОНЕНТ ДЛЯ ЗАГРУЗКИ СТАТИСТИКИ АДМИНИСТРАТОРА
 */
async function AdminDashboardLoader() {
  const stats = await getAdminDashboardStats()
  return <AdminDashboardStats stats={stats} />
}

/**
 * СКЕЛЕТОН ДЛЯ ЗАГРУЗКИ
 */
function DashboardSkeleton() {
  return (
    <Stack gap={6}>
      <Skeleton height="120px" />
      <Stack direction={{ base: 'column', md: 'row' }} gap={4}>
        <Skeleton height="200px" flex={1} />
        <Skeleton height="200px" flex={1} />
      </Stack>
      <Stack direction={{ base: 'column', md: 'row' }} gap={4}>
        <Skeleton height="300px" flex={1} />
        <Skeleton height="300px" flex={1} />
      </Stack>
    </Stack>
  )
}

/**
 * ГЛАВНАЯ СТРАНИЦА DASHBOARD
 * Определяет роль пользователя и показывает соответствующий dashboard
 */
import { prisma } from '@/lib/db'

// ...

export default async function DashboardPage() {
  const session = await getSession()

  // Проверка аутентификации
  if (!session?.user) {
    redirect('/sign-in')
  }

  const { role } = session.user

  // Если пользователь - клиент, проверяем заполненность профиля
  if (role === 'CLIENT') {
    const client = await prisma.client.findUnique({
      where: { userId: session.user.id },
      select: { mainRequest: true },
    })

    if (!client || !client.mainRequest) {
      redirect('/draft-request')
    }
  }

  // Заголовки для разных ролей

  // Заголовки для разных ролей
  const titles = {
    CLIENT: 'Ваша панель управления',
    SPECIALIST: 'Панель специалиста',
    ADMIN: 'Панель администратора',
  }

  const descriptions = {
    CLIENT: 'Отслеживайте свой прогресс трансформации',
    SPECIALIST: 'Статистика вашей работы с клиентами',
    ADMIN: 'Системная статистика и управление',
  }

  return (
    <Container maxW="container.xl" py={8}>
      {/* Заголовок */}
      <Box mb={8}>
        <Heading size="2xl" mb={2}>
          {titles[role]}
        </Heading>
        <Text fontSize="lg" color="gray.600">
          {descriptions[role]}
        </Text>
      </Box>

      {/* Dashboard в зависимости от роли */}
      <Suspense fallback={<DashboardSkeleton />}>
        {role === 'CLIENT' && <ClientDashboardLoader />}
        {role === 'SPECIALIST' && <SpecialistDashboardLoader />}
        {role === 'ADMIN' && <AdminDashboardLoader />}
      </Suspense>
    </Container>
  )
}
