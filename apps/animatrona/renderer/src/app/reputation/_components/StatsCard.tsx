'use client'

/**
 * Карточка статистики пользователя
 * Показывает трафик, время раздачи, количество контента
 */

import { Box, Card, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuActivity, LuClock, LuDownload, LuHardDrive, LuUpload, LuUsers } from 'react-icons/lu'

import { formatBytes } from '@/lib/format-utils'

import type { UserStats } from '../../../../../shared/types/stats'

interface StatsCardProps {
  stats: UserStats | null
  isLoading?: boolean
}

/**
 * Форматирует миллисекунды в часы/дни
 */
function formatDuration(ms: number | string): string {
  const numMs = typeof ms === 'string' ? Number(ms) : ms
  const hours = numMs / (1000 * 60 * 60)

  if (hours < 24) {
    return `${hours.toFixed(1)} ч`
  }

  const days = hours / 24
  return `${days.toFixed(1)} д`
}

/**
 * Рассчитывает соотношение upload/download
 */
function calculateRatio(uploaded: number | string, downloaded: number | string): string {
  const up = typeof uploaded === 'string' ? Number(uploaded) : uploaded
  const down = typeof downloaded === 'string' ? Number(downloaded) : downloaded

  if (down === 0) {
    return up > 0 ? '∞' : '0.00'
  }
  return (up / down).toFixed(2)
}

interface StatItemProps {
  icon: React.ElementType
  label: string
  value: string
  color: string
}

function StatItem({ icon: IconComponent, label, value, color }: StatItemProps) {
  return (
    <VStack align="stretch" gap={1}>
      <HStack gap={2}>
        <IconComponent size={16} color={`var(--chakra-colors-${color.replaceAll('.', '-')})`} />
        <Text fontSize="sm" color="fg.subtle">
          {label}
        </Text>
      </HStack>
      <Text fontSize="xl" fontWeight="bold">
        {value}
      </Text>
    </VStack>
  )
}

export function StatsCard({ stats, isLoading }: StatsCardProps) {
  if (isLoading) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Header>
          <HStack gap={3}>
            <LuActivity size={20} color="var(--chakra-colors-blue-400)" />
            <Heading size="md">Статистика</Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Text color="fg.subtle">Загрузка...</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  if (!stats) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Header>
          <HStack gap={3}>
            <LuActivity size={20} color="var(--chakra-colors-blue-400)" />
            <Heading size="md">Статистика</Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Text color="fg.subtle">Нет данных</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  const ratio = calculateRatio(stats.bytesUploaded, stats.bytesDownloaded)

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <LuActivity size={20} color="var(--chakra-colors-blue-400)" />
          <Heading size="md">Статистика</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <SimpleGrid columns={{ base: 2, md: 3 }} gap={6}>
          <StatItem icon={LuUpload} label="Отдано" value={formatBytes(Number(stats.bytesUploaded))} color="green.400" />
          <StatItem
            icon={LuDownload}
            label="Получено"
            value={formatBytes(Number(stats.bytesDownloaded))}
            color="orange.400"
          />
          <StatItem icon={LuHardDrive} label="Ratio" value={ratio} color="purple.400" />
          <StatItem
            icon={LuClock}
            label="Время раздачи"
            value={formatDuration(stats.totalSeedingTimeMs)}
            color="blue.400"
          />
          <StatItem icon={LuUsers} label="Помог пирам" value={String(stats.peersHelped)} color="teal.400" />
          <StatItem
            icon={LuHardDrive}
            label="Уникальный контент"
            value={String(stats.uniqueContentSeeded)}
            color="pink.400"
          />
        </SimpleGrid>

        {stats.firstSeedAt && (
          <Box mt={4} pt={4} borderTop="1px" borderColor="border.subtle">
            <Text fontSize="sm" color="fg.subtle">
              Первая раздача: {new Date(stats.firstSeedAt).toLocaleDateString('ru-RU')}
            </Text>
          </Box>
        )}
      </Card.Body>
    </Card.Root>
  )
}
