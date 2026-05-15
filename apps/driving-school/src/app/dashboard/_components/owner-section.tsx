/**
 * Секция для владельца платформы
 *
 * @module owner-section
 */

import { Box, Heading, SimpleGrid, VStack } from '@chakra-ui/react'
import { LuBuilding, LuMessageSquare, LuUsers } from 'react-icons/lu'

import { getOwnerAlerts } from '../_actions/alerts.action'
import { AlertsPanel } from './alerts-panel'
import { DashboardCard } from './dashboard-card'

/**
 * Секция дашборда для владельца платформы (async)
 */
export async function OwnerSection() {
  const alertsResult = await getOwnerAlerts()

  return (
    <VStack gap={6} align="stretch">
      {/* Панель алертов */}
      {alertsResult.alerts.length > 0 && <AlertsPanel alerts={alertsResult.alerts} />}

      <Box>
        <Heading size="lg" mb={4}>
          Администрирование платформы
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          <DashboardCard
            icon={<LuUsers size={24} />}
            title="Пользователи"
            description="Управление пользователями"
            href="/owner/users"
          />
          <DashboardCard
            icon={<LuBuilding size={24} />}
            title="Школы"
            description="Все автошколы платформы"
            href="/owner/schools"
          />
          <DashboardCard
            icon={<LuMessageSquare size={24} />}
            title="Поддержка"
            description="Тикеты пользователей"
            href="/owner/support"
          />
        </SimpleGrid>
      </Box>
    </VStack>
  )
}
