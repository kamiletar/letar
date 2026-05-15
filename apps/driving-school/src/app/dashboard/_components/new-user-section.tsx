/**
 * Секция для нового пользователя
 *
 * @module new-user-section
 */

import { Box, Heading, SimpleGrid } from '@chakra-ui/react'
import { LuBuilding, LuSearch } from 'react-icons/lu'

import { DashboardCard } from './dashboard-card'

/**
 * Секция для пользователей без специальных ролей
 */
export function NewUserSection() {
  return (
    <Box>
      <Heading size="lg" mb={4}>
        Начать обучение
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
        <DashboardCard
          icon={<LuSearch size={24} />}
          title="Найти инструктора"
          description="Каталог частных инструкторов"
          href="/instructors"
        />
        <DashboardCard
          icon={<LuBuilding size={24} />}
          title="Найти автошколу"
          description="Каталог автошкол"
          href="/schools"
        />
      </SimpleGrid>
    </Box>
  )
}
