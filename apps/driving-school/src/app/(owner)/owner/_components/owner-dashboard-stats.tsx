'use client'

import { calculateTrend, KPICard, KPIGrid } from '@/app/_components/kpi-card'
import { SimpleGrid } from '@chakra-ui/react'
import { RoleStat } from '@letar/ui'
import { LuBuilding2, LuCalendarCheck, LuMessageSquare, LuUsers } from 'react-icons/lu'

interface StatsData {
  users: { total: number; newWeek: number; newPrevWeek: number; newMonth: number }
  schools: { total: number; weekAgo: number }
  lessons: { total: number; week: number; prevWeek: number; month: number; dailySparkline: number[] }
  tickets: { open: number; openWeekAgo: number; total: number }
  roles: { users: number; freelanceInstructors: number; moderators: number; owners: number }
}

interface OwnerDashboardStatsProps {
  stats: StatsData
}

/**
 * Client Component для отображения KPI статистики с трендами и sparkline
 * Показывает основные метрики платформы с визуализацией изменений
 */
export function OwnerDashboardStats({ stats }: OwnerDashboardStatsProps) {
  // Расчёт трендов
  const usersTrend = calculateTrend(stats.users.newWeek, stats.users.newPrevWeek)
  const schoolsTrend = calculateTrend(stats.schools.total, stats.schools.weekAgo)
  const lessonsTrend = calculateTrend(stats.lessons.week, stats.lessons.prevWeek)
  const ticketsTrend = calculateTrend(stats.tickets.open, stats.tickets.openWeekAgo)

  return (
    <KPIGrid>
      <KPICard
        title="Пользователи"
        value={stats.users.total}
        trend={usersTrend}
        icon={<LuUsers size={20} />}
        colorPalette="blue"
        periodLabel="за неделю"
      />
      <KPICard
        title="Автошколы"
        value={stats.schools.total}
        trend={schoolsTrend}
        icon={<LuBuilding2 size={20} />}
        colorPalette="green"
        periodLabel="активных"
      />
      <KPICard
        title="Занятия за неделю"
        value={stats.lessons.week}
        trend={lessonsTrend}
        sparklineData={stats.lessons.dailySparkline}
        icon={<LuCalendarCheck size={20} />}
        colorPalette="purple"
        periodLabel={`всего: ${stats.lessons.total}`}
      />
      <KPICard
        title="Открытые обращения"
        value={stats.tickets.open}
        trend={ticketsTrend}
        invertTrend
        icon={<LuMessageSquare size={20} />}
        colorPalette="orange"
        periodLabel={`из ${stats.tickets.total} всего`}
      />
    </KPIGrid>
  )
}

interface RoleStatsProps {
  roles: { users: number; freelanceInstructors: number; moderators: number; owners: number }
}

/**
 * Client Component для распределения по ролям
 */
export function OwnerRoleStats({ roles }: RoleStatsProps) {
  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
      <RoleStat label="Пользователи" count={roles.users} colorPalette="blue" />
      <RoleStat label="Инструкторы" count={roles.freelanceInstructors} colorPalette="green" />
      <RoleStat label="Модераторы" count={roles.moderators} colorPalette="purple" />
      <RoleStat label="Владельцы" count={roles.owners} colorPalette="orange" />
    </SimpleGrid>
  )
}
