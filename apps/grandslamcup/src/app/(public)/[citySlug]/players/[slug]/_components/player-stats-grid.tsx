/**
 * Сетка статистики поэта: StatCard + TrendCard.
 */

import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import { LuCalendarDays, LuMic, LuPenLine, LuStar, LuTrendingDown, LuTrendingUp, LuTrophy } from 'react-icons/lu'
import type { PlayerStats } from '../_lib/compute-player-stats'

interface PlayerStatsGridProps {
  stats: PlayerStats
}

/** Цвет тренда */
function trendProps(trend: string) {
  if (trend === '↑' || trend === '↗') {
    return { color: 'green.500', icon: LuTrendingUp }
  }
  if (trend === '↓' || trend === '↘') {
    return { color: 'red.500', icon: LuTrendingDown }
  }
  return { color: 'fg.muted', icon: null }
}

function StatCard({
  label,
  value,
  highlight,
  icon,
}: {
  label: string
  value: number | string
  highlight?: boolean
  icon?: React.ReactNode
}) {
  return (
    <Box bg="bg.panel" borderRadius="xl" p={4} borderWidth="1px" borderColor="border" textAlign="center">
      {icon && (
        <Box color={highlight ? 'brand.solid' : 'fg.muted'} mb={1}>
          {icon}
        </Box>
      )}
      <Text
        fontSize="2xl"
        fontWeight={highlight ? 'bold' : 'semibold'}
        fontFamily="mono"
        color={highlight ? 'brand.solid' : undefined}
      >
        {value}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
    </Box>
  )
}

function TrendCard({ trend }: { trend: string }) {
  const { color, icon: Icon } = trendProps(trend)
  return (
    <Box bg="bg.panel" borderRadius="xl" p={4} borderWidth="1px" borderColor="border" textAlign="center">
      <Box color={color} mb={1}>
        {Icon ? <Icon size={18} /> : <Text fontSize="lg">→</Text>}
      </Box>
      <Text fontSize="2xl" fontWeight="semibold" color={color}>
        {trend}
      </Text>
      <Text fontSize="xs" color="fg.muted">
        Тренд
      </Text>
    </Box>
  )
}

export function PlayerStatsGrid({ stats }: PlayerStatsGridProps) {
  if (stats.matchesPlayed === 0) {
    return null
  }

  return (
    <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 6 }} gap={3}>
      <StatCard label="Выступлений" value={stats.matchesPlayed} icon={<LuMic size={18} />} />
      <StatCard label="Средний балл" value={stats.avgScore} highlight icon={<LuStar size={18} />} />
      <StatCard label="Ср. текст" value={stats.avgText} icon={<LuPenLine size={18} />} />
      <StatCard label="Ср. подача" value={stats.avgDelivery} icon={<LuMic size={18} />} />
      <StatCard label="Лучший" value={stats.bestScore} icon={<LuTrophy size={18} />} />
      <TrendCard trend={stats.trend} />
      {stats.perfectScores > 0 && (
        <StatCard label="Тридцатки" value={stats.perfectScores} icon={<LuStar size={18} />} />
      )}
      {stats.totalRounds > 0 && (
        <StatCard
          label={`Побед ${stats.roundWins}/${stats.totalRounds}`}
          value={`${stats.winPct}%`}
          icon={<LuTrophy size={18} />}
        />
      )}
      {stats.avgDurationSec !== null && (
        <StatCard
          label="Ср. время"
          value={`${Math.floor(stats.avgDurationSec / 60)}:${String(stats.avgDurationSec % 60).padStart(2, '0')}`}
          icon={<LuCalendarDays size={18} />}
        />
      )}
    </SimpleGrid>
  )
}
