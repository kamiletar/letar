'use client'

/**
 * KPI карточки для сводной аналитики инструкторов.
 */

import { Box, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuMessageSquare, LuStar, LuThumbsUp, LuUsers } from 'react-icons/lu'

import type { InstructorAnalyticsSummary } from '../../../_actions/instructor-analytics.action'

interface InstructorKpiCardsProps {
  summary: InstructorAnalyticsSummary
}

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  colorPalette: string
}

function KpiCard({ title, value, subtitle, icon, colorPalette }: KpiCardProps) {
  return (
    <Box bg="bg.panel" borderRadius="lg" borderWidth="1px" p={4} shadow="sm">
      <HStack justify="space-between" mb={3}>
        <Text fontSize="sm" color="fg.muted" fontWeight="medium">
          {title}
        </Text>
        <Box p={2} borderRadius="md" bg={`${colorPalette}.subtle`}>
          <Icon boxSize={5} color={`${colorPalette}.fg`}>
            {icon}
          </Icon>
        </Box>
      </HStack>

      <VStack align="start" gap={0}>
        <Text fontSize="2xl" fontWeight="bold">
          {value}
        </Text>
        {subtitle && (
          <Text fontSize="xs" color="fg.muted">
            {subtitle}
          </Text>
        )}
      </VStack>
    </Box>
  )
}

export function InstructorKpiCards({ summary }: InstructorKpiCardsProps) {
  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
      <KpiCard
        title="Инструкторов"
        value={summary.totalInstructors}
        subtitle="в школе"
        icon={<LuUsers />}
        colorPalette="blue"
      />

      <KpiCard
        title="Средний рейтинг"
        value={summary.avgSchoolRating !== null ? summary.avgSchoolRating.toFixed(1) : '—'}
        subtitle="по школе"
        icon={<LuStar />}
        colorPalette="yellow"
      />

      <KpiCard
        title="Всего отзывов"
        value={summary.totalReviews}
        subtitle="от учеников"
        icon={<LuMessageSquare />}
        colorPalette="purple"
      />

      <KpiCard
        title="Рекомендовали бы"
        value={summary.avgRecommendRate !== null ? `${summary.avgRecommendRate}%` : '—'}
        subtitle="средний показатель"
        icon={<LuThumbsUp />}
        colorPalette="green"
      />
    </SimpleGrid>
  )
}
