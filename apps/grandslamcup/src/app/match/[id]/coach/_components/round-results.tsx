'use client'

/**
 * Результаты раундов для экрана тренера
 */

import { Badge, Box, Flex, Text, VStack } from '@chakra-ui/react'

export interface PerformanceResult {
  id: string
  half: number
  roundNumber: number
  playerName: string
  teamSeasonId: string
  totalScore: number | null
  textAdjusted: number | null
  deliveryAdjusted: number | null
}

interface RoundResultsProps {
  performances: PerformanceResult[]
  coachTeamSeasonId: string
}

export function RoundResults({ performances, coachTeamSeasonId }: RoundResultsProps) {
  if (performances.length === 0) {
    return (
      <Text color="fg.muted" textAlign="center" py={4}>
        Нет результатов
      </Text>
    )
  }

  // Группировка по тайм + раунд
  const grouped = new Map<string, PerformanceResult[]>()
  for (const p of performances) {
    const key = `${p.half}-${p.roundNumber}`
    const list = grouped.get(key) ?? []
    list.push(p)
    grouped.set(key, list)
  }

  return (
    <VStack gap={2} align="stretch">
      {[...grouped.entries()].map(([key, perfs]) => {
        const [half, round] = key.split('-')
        return (
          <Box key={key} bg="bg.subtle" borderRadius="lg" p={3}>
            <Text fontSize="xs" color="fg.muted" mb={2}>
              Тайм {half}, Раунд {round}
            </Text>
            <Flex direction="column" gap={1}>
              {perfs.map((p) => {
                const isOurs = p.teamSeasonId === coachTeamSeasonId
                return (
                  <Flex key={p.id} justify="space-between" align="center">
                    <Text fontSize="sm" fontWeight={isOurs ? 'semibold' : 'normal'} color={isOurs ? 'fg' : 'fg.muted'}>
                      {p.playerName}
                    </Text>
                    {p.totalScore !== null
                      ? (
                        <Badge colorPalette={isOurs ? 'green' : 'gray'} size="sm">
                          {p.totalScore}
                        </Badge>
                      )
                      : (
                        <Badge colorPalette="yellow" size="sm">
                          ...
                        </Badge>
                      )}
                  </Flex>
                )
              })}
            </Flex>
          </Box>
        )
      })}
    </VStack>
  )
}
