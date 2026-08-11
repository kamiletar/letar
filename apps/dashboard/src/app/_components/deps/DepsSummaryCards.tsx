'use client'

import { MetricCardSkeleton, SkeletonGrid } from '@/app/_components/ui/skeletons'
import { formatDateTime, formatRelativeTime } from '@/lib/format'
import { Card, SimpleGrid, Text } from '@chakra-ui/react'

export interface DepsSummary {
  riskScore: number
  outdatedCount: number
  majorCount: number
  minorCount: number
  patchCount: number
  vulnCritical: number
  vulnHigh: number
  vulnModerate: number
  vulnLow: number
  lockfileUpdatedAt: string | null
  scannedAt: string | null
}

function riskColor(score: number): string {
  if (score >= 60) {
    return 'red'
  }
  if (score >= 25) {
    return 'orange'
  }
  if (score > 0) {
    return 'yellow'
  }
  return 'green'
}

export function DepsSummaryCards({ summary, isLoading }: { summary: DepsSummary | null; isLoading: boolean }) {
  if (isLoading) {
    return <SkeletonGrid count={5} columns={{ base: 2, md: 3, lg: 5 }} SkeletonComponent={MetricCardSkeleton} />
  }

  if (!summary) {
    return null
  }

  const cards = [
    {
      label: 'Risk score',
      value: `${summary.riskScore}/100`,
      color: `${riskColor(summary.riskScore)}.500`,
    },
    {
      label: 'Устарело',
      value: `${summary.outdatedCount}`,
      sub: `${summary.majorCount} major · ${summary.minorCount} minor · ${summary.patchCount} patch`,
      color: summary.outdatedCount > 0 ? 'orange.500' : 'green.500',
    },
    {
      label: 'Уязвимости',
      value: `${summary.vulnCritical + summary.vulnHigh}`,
      sub:
        `critical ${summary.vulnCritical} · high ${summary.vulnHigh} · moderate ${summary.vulnModerate} · low ${summary.vulnLow}`,
      color: summary.vulnCritical > 0 ? 'red.500' : summary.vulnHigh > 0 ? 'orange.500' : 'green.500',
    },
    {
      label: 'Lockfile',
      value: summary.lockfileUpdatedAt
        ? formatRelativeTime(Math.floor(new Date(summary.lockfileUpdatedAt).getTime() / 1000))
        : '—',
      color: 'fg.default',
    },
    {
      label: 'Последний скан',
      value: summary.scannedAt ? formatDateTime(summary.scannedAt) : 'Ни разу',
      color: 'fg.default',
    },
  ]

  return (
    <SimpleGrid columns={{ base: 2, md: 3, lg: 5 }} gap="4" mb="6">
      {cards.map((c) => (
        <Card.Root key={c.label}>
          <Card.Body>
            <Text fontSize="sm" color="fg.muted">
              {c.label}
            </Text>
            <Text fontSize="xl" fontWeight="bold" color={c.color}>
              {c.value}
            </Text>
            {c.sub && (
              <Text fontSize="xs" color="fg.muted" mt="1">
                {c.sub}
              </Text>
            )}
          </Card.Body>
        </Card.Root>
      ))}
    </SimpleGrid>
  )
}
