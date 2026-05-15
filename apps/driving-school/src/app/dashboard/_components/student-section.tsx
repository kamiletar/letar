/**
 * Секция для ученика
 *
 * @module student-section
 */

import { Box, Heading, SimpleGrid, VStack } from '@chakra-ui/react'
import { Suspense } from 'react'
import { LuBuilding, LuCalendar, LuSearch, LuUsers } from 'react-icons/lu'

import { DashboardCard } from './dashboard-card'
import { TodayWidgetStudent } from './today-widget-student'

interface StudentSectionProps {
  userId: string
  hasInstructors: boolean
}

/**
 * Секция дашборда для учеников
 */
export function StudentSection({ userId, hasInstructors }: StudentSectionProps) {
  return (
    <VStack gap={6} align="stretch">
      {/* Виджет "Сегодня" */}
      <Suspense fallback={null}>
        <TodayWidgetStudent userId={userId} />
      </Suspense>

      <Box>
        <Heading size="lg" mb={4}>
          Обучение
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          <DashboardCard
            icon={<LuUsers size={24} />}
            title="Мои инструкторы"
            description={hasInstructors ? 'Ваши инструкторы по вождению' : 'Пока нет инструкторов'}
            href="/my-instructors"
          />
          <DashboardCard
            icon={<LuCalendar size={24} />}
            title="Моё расписание"
            description="Расписание и запись на занятия"
            href="/my-schedule"
          />
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
    </VStack>
  )
}
