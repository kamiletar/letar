'use client'

import { Box, Card, HStack, SimpleGrid, Stat, Text, VStack } from '@chakra-ui/react'
import { LuBook, LuCalendarCheck, LuCalendarX, LuShield, LuUser, LuUserCheck, LuUsers, LuUserX } from 'react-icons/lu'
import type { SchoolLessonStats, SchoolMemberStats } from '../_actions/school-stats.action'

interface SchoolStatsCardsProps {
  members: SchoolMemberStats
  lessons: SchoolLessonStats
}

export function SchoolStatsCards({ members, lessons }: SchoolStatsCardsProps) {
  const completionRate = lessons.total > 0 ? ((lessons.completed / lessons.total) * 100).toFixed(1) : '0'

  return (
    <VStack gap={6} align="stretch">
      {/* Статистика членов школы */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <StatCard label="Всего членов" value={members.totalMembers} icon={<LuUsers />} colorPalette="purple" />
        <StatCard label="Администраторов" value={members.admins} icon={<LuShield />} colorPalette="blue" />
        <StatCard label="Инструкторов" value={members.instructors} icon={<LuUserCheck />} colorPalette="green" />
        <StatCard label="Учеников" value={members.students} icon={<LuUser />} colorPalette="teal" />
      </SimpleGrid>

      {/* Статистика занятий */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <StatCard label="Всего занятий" value={lessons.total} icon={<LuBook />} colorPalette="blue" />
        <StatCard
          label="Завершено"
          value={lessons.completed}
          helpText={`${completionRate}%`}
          icon={<LuCalendarCheck />}
          colorPalette="green"
        />
        <StatCard label="Отменено" value={lessons.cancelled} icon={<LuCalendarX />} colorPalette="orange" />
        <StatCard label="Неявки" value={lessons.noShow} icon={<LuUserX />} colorPalette="red" />
      </SimpleGrid>
    </VStack>
  )
}

interface StatCardProps {
  label: string
  value: number
  helpText?: string
  icon: React.ReactNode
  colorPalette: string
}

function StatCard({ label, value, helpText, icon, colorPalette }: StatCardProps) {
  return (
    <Card.Root>
      <Card.Body>
        <Stat.Root>
          <HStack justify="space-between" mb={2}>
            <Stat.Label color="fg.muted">{label}</Stat.Label>
            <Box color={`${colorPalette}.fg`}>{icon}</Box>
          </HStack>
          <Stat.ValueText fontSize="2xl" fontWeight="bold">
            {value}
          </Stat.ValueText>
          {helpText && (
            <Text fontSize="sm" color="fg.muted" mt={1}>
              {helpText}
            </Text>
          )}
        </Stat.Root>
      </Card.Body>
    </Card.Root>
  )
}
