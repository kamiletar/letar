'use client'

/**
 * Экран HALF_SUMMARY для ведущего — только просмотр, без кнопок.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'

interface PerformanceData {
  id: string
  half: number
  teamSeasonId: string
  textAdjusted: number | null
  deliveryAdjusted: number | null
  totalScore: number | null
  playerName: string
}

interface PresenterHalfSummaryProps {
  match: {
    homeTeam: { id: string; name: string }
    awayTeam: { id: string; name: string }
    performances: PerformanceData[]
  }
  matchState: MatchSSEState | null
}

export function PresenterHalfSummary({ match, matchState }: PresenterHalfSummaryProps) {
  const half = matchState?.currentHalf ?? 1
  const isFirstHalf = half === 1

  const halfPerfs = match.performances.filter((p) => p.half === half && p.totalScore !== null)

  const homeHalfTotal = halfPerfs
    .filter((p) => p.teamSeasonId === match.homeTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const awayHalfTotal = halfPerfs
    .filter((p) => p.teamSeasonId === match.awayTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)

  const allPerfs = match.performances.filter((p) => p.totalScore !== null)
  const homeTotalAll = allPerfs
    .filter((p) => p.teamSeasonId === match.homeTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const awayTotalAll = allPerfs
    .filter((p) => p.teamSeasonId === match.awayTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)

  return (
    <VStack gap={5} align="stretch" py={4}>
      <Box textAlign="center">
        <Heading size="2xl" mb={1}>
          Тайм {half} завершён
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {isFirstHalf ? 'Промежуточные результаты' : 'Финальные итоги тайма'}
        </Text>
      </Box>

      <SimpleGrid columns={2} gap={4}>
        <Box
          p={5}
          borderRadius="xl"
          borderWidth="2px"
          borderColor={homeHalfTotal > awayHalfTotal ? 'green.solid' : 'border.muted'}
          bg={homeHalfTotal > awayHalfTotal ? 'green.subtle' : 'bg.panel'}
          textAlign="center"
        >
          <Text fontSize="sm" color="fg.muted" lineClamp={1} mb={1}>
            {match.homeTeam.name}
          </Text>
          <Heading size="5xl">{homeHalfTotal}</Heading>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            Этот тайм
          </Text>
          {homeHalfTotal > awayHalfTotal && (
            <Badge colorPalette="green" size="sm" mt={1}>
              Лидирует
            </Badge>
          )}
        </Box>
        <Box
          p={5}
          borderRadius="xl"
          borderWidth="2px"
          borderColor={awayHalfTotal > homeHalfTotal ? 'green.solid' : 'border.muted'}
          bg={awayHalfTotal > homeHalfTotal ? 'green.subtle' : 'bg.panel'}
          textAlign="center"
        >
          <Text fontSize="sm" color="fg.muted" lineClamp={1} mb={1}>
            {match.awayTeam.name}
          </Text>
          <Heading size="5xl">{awayHalfTotal}</Heading>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            Этот тайм
          </Text>
          {awayHalfTotal > homeHalfTotal && (
            <Badge colorPalette="green" size="sm" mt={1}>
              Лидирует
            </Badge>
          )}
        </Box>
      </SimpleGrid>

      {!isFirstHalf && (
        <Box p={5} borderRadius="xl" borderWidth="2px" borderColor="border.muted" bg="bg.subtle" textAlign="center">
          <Text fontSize="xs" color="fg.muted" mb={1}>
            Итоговый счёт матча
          </Text>
          <Heading size="4xl">
            <Text as="span" color={homeTotalAll >= awayTotalAll ? 'green.fg' : 'fg.muted'}>
              {homeTotalAll}
            </Text>
            <Text as="span" color="fg.muted" mx={2}>
              :
            </Text>
            <Text as="span" color={awayTotalAll >= homeTotalAll ? 'green.fg' : 'fg.muted'}>
              {awayTotalAll}
            </Text>
          </Heading>
          <Text fontSize="sm" color="fg.muted" mt={1}>
            {match.homeTeam.name} vs {match.awayTeam.name}
          </Text>
        </Box>
      )}

      {/* Топ участников */}
      {halfPerfs.length > 0 && (
        <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
          <Heading size="sm" mb={3}>
            📊 Участники
          </Heading>
          <VStack gap={2} align="stretch">
            {[...halfPerfs]
              .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
              .map((p, idx) => {
                const isHome = p.teamSeasonId === match.homeTeam.id
                return (
                  <Flex key={p.id} justify="space-between" align="center">
                    <Text fontSize="sm" color="fg.muted" w="20px">
                      {idx === 0 ? '🥇' : idx + 1}
                    </Text>
                    <Text fontSize="sm" flex={1} mx={2} truncate>
                      {p.playerName}
                    </Text>
                    <Badge colorPalette={isHome ? 'blue' : 'orange'} size="sm" variant="subtle" mr={2}>
                      {isHome ? match.homeTeam.name : match.awayTeam.name}
                    </Badge>
                    <Badge colorPalette="blue" size="sm">
                      {p.totalScore}
                    </Badge>
                  </Flex>
                )
              })}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}
