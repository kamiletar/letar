'use client'

import { Box, Card, HStack, SimpleGrid, Stat, Text, VStack } from '@chakra-ui/react'
import {
  LuBook,
  LuCalendarCheck,
  LuCalendarX,
  LuCreditCard,
  LuUserCheck,
  LuUserMinus,
  LuUsers,
  LuUserX,
} from 'react-icons/lu'
import type { FinanceStats, LessonStats, LessonTypeStats, StudentStats } from '../_actions/stats.action'

interface StatsCardsProps {
  lessons: LessonStats
  students: StudentStats
  finance: FinanceStats
  lessonTypeStats: LessonTypeStats[]
}

// Форматирование цены
function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(price)
}

export function StatsCards({ lessons, students, finance, lessonTypeStats }: StatsCardsProps) {
  // Вычисляем процент завершённых занятий
  const completionRate = lessons.total > 0 ? ((lessons.completed / lessons.total) * 100).toFixed(1) : '0'

  // Вычисляем процент неявок
  const noShowRate = lessons.total > 0 ? ((lessons.noShow / lessons.total) * 100).toFixed(1) : '0'

  return (
    <VStack gap={6} align="stretch">
      {/* Основная статистика занятий */}
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
        <StatCard
          label="Неявки"
          value={lessons.noShow}
          helpText={`${noShowRate}%`}
          icon={<LuUserX />}
          colorPalette="red"
        />
      </SimpleGrid>

      {/* Статистика учеников */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <StatCard label="Всего учеников" value={students.total} icon={<LuUsers />} colorPalette="purple" />
        <StatCard label="Активных" value={students.active} icon={<LuUserCheck />} colorPalette="green" />
        <StatCard label="На паузе" value={students.paused} icon={<LuUserMinus />} colorPalette="yellow" />
        <StatCard label="Отключённых" value={students.disconnected} icon={<LuUserX />} colorPalette="gray" />
      </SimpleGrid>

      {/* Финансовая статистика */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <StatCard
          label="Общий доход"
          value={formatPrice(finance.totalRevenue)}
          icon={<LuCreditCard />}
          colorPalette="brand"
          isFormatted
        />
        <StatCard
          label="Предоплаченных занятий"
          value={finance.totalPrepaidBalance}
          icon={<LuCreditCard />}
          colorPalette="teal"
        />
        <StatCard
          label="Начислено штрафов"
          value={finance.totalPenaltiesCharged}
          icon={<LuCalendarX />}
          colorPalette="orange"
        />
        <StatCard
          label="Оплачено штрафов"
          value={finance.totalPenaltiesPaid}
          icon={<LuCalendarCheck />}
          colorPalette="green"
        />
      </SimpleGrid>

      {/* Статистика по типам занятий */}
      {lessonTypeStats.length > 0 && (
        <Box>
          <Text fontWeight="medium" mb={3}>
            Доходы по типам занятий
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {lessonTypeStats.map((type) => (
              <Card.Root key={type.id}>
                <Card.Body>
                  <VStack align="stretch" gap={2}>
                    <Text fontWeight="medium" lineClamp={1}>
                      {type.name}
                    </Text>
                    <HStack justify="space-between">
                      <Text color="fg.muted" fontSize="sm">
                        Завершено: {type.completedCount}
                      </Text>
                      <Text fontWeight="semibold" color="fg.default">
                        {formatPrice(type.revenue)}
                      </Text>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </VStack>
  )
}

interface StatCardProps {
  label: string
  value: number | string
  helpText?: string
  icon: React.ReactNode
  colorPalette: string
  isFormatted?: boolean
}

function StatCard({ label, value, helpText, icon, colorPalette, isFormatted }: StatCardProps) {
  return (
    <Card.Root>
      <Card.Body>
        <Stat.Root>
          <HStack justify="space-between" mb={2}>
            <Stat.Label color="fg.muted">{label}</Stat.Label>
            <Box color={`${colorPalette}.fg`}>{icon}</Box>
          </HStack>
          <Stat.ValueText fontSize={isFormatted ? 'xl' : '2xl'} fontWeight="bold">
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
