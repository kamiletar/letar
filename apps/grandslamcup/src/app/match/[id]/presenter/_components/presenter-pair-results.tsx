'use client'

/**
 * Экран PAIR_RESULTS для ведущего.
 *
 * Показывает итоги пары + кнопка «Следующая пара» / «Итоги тайма»
 * (дублирует скорера).
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { nextRoundAction, showHalfSummaryAction } from '../../score/_actions/scorer.action'

interface PerformanceData {
  id: string
  half: number
  roundNumber: number
  playerName: string
  teamSeasonId: string
  textAdjusted: number | null
  deliveryAdjusted: number | null
  totalScore: number | null
}

interface PresenterPairResultsProps {
  match: {
    id: string
    homeTeam: { id: string; name: string }
    awayTeam: { id: string; name: string }
    performances: PerformanceData[]
  }
  matchState: MatchSSEState | null
}

export function PresenterPairResults({ match, matchState }: PresenterPairResultsProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const half = matchState?.currentHalf ?? 1
  const round = matchState?.currentRound ?? 1

  // Пары в текущем тайме с завершёнными оценками
  const completedPairsInHalf = Math.floor(
    match.performances.filter((p) => p.half === half && p.totalScore !== null).length / 2
  )
  const isLastPair = completedPairsInHalf >= 5

  const pair = match.performances
    .filter((p) => p.half === half && p.roundNumber === round && p.totalScore !== null)
    .slice(0, 2)

  const winner =
    pair.length === 2 && pair[0].totalScore !== null && pair[1].totalScore !== null
      ? pair[0].totalScore > pair[1].totalScore
        ? pair[0]
        : pair[1].totalScore > pair[0].totalScore
          ? pair[1]
          : null
      : null

  const handleNext = useCallback(async () => {
    setPending(true)
    setError(null)
    const res = isLastPair ? await showHalfSummaryAction(match.id) : await nextRoundAction(match.id)
    setPending(false)
    if (!res.success) {
      setError('Не удалось перейти дальше')
      return
    }
    router.refresh()
  }, [match.id, router, isLastPair])

  const nextLabel = isLastPair ? '→ Итоги тайма' : `→ Следующая пара (${completedPairsInHalf + 1}/5)`

  return (
    <VStack gap={5} align="stretch" py={4}>
      <Box textAlign="center">
        <Heading size="2xl" mb={2}>
          Пара {round} завершена
        </Heading>
        <Text color="fg.muted">Тайм {half}</Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {pair.map((perf) => {
          const isWinner = winner?.id === perf.id
          const isHome = perf.teamSeasonId === match.homeTeam.id
          return (
            <Box
              key={perf.id}
              p={5}
              borderRadius="xl"
              borderWidth="2px"
              borderColor={isWinner ? 'green.solid' : 'border.muted'}
              bg={isWinner ? 'green.subtle' : 'bg.panel'}
            >
              <Flex justify="space-between" align="start" mb={2}>
                <Box>
                  <Badge colorPalette={isHome ? 'blue' : 'orange'} size="sm" mb={1}>
                    {isHome ? match.homeTeam.name : match.awayTeam.name}
                  </Badge>
                  <Heading size="lg" lineClamp={2}>
                    {perf.playerName}
                  </Heading>
                </Box>
                {isWinner && (
                  <Badge colorPalette="green" size="sm">
                    🏆 Победил
                  </Badge>
                )}
              </Flex>
              <VStack gap={2} align="stretch" mt={3}>
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm" color="fg.muted">
                    📜 Текст
                  </Text>
                  <Badge colorPalette="gray" size="sm">
                    {perf.textAdjusted ?? '—'}
                  </Badge>
                </Flex>
                <Flex justify="space-between" align="center">
                  <Text fontSize="sm" color="fg.muted">
                    🎭 Подача
                  </Text>
                  <Badge colorPalette="gray" size="sm">
                    {perf.deliveryAdjusted ?? '—'}
                  </Badge>
                </Flex>
                <Flex justify="space-between" align="center" pt={2} borderTopWidth="1px" borderColor="border.muted">
                  <Text fontWeight="bold" fontSize="lg">
                    Итого:
                  </Text>
                  <Badge colorPalette="blue" size="lg" fontSize="xl">
                    {perf.totalScore ?? '—'}
                  </Badge>
                </Flex>
              </VStack>
            </Box>
          )
        })}
      </SimpleGrid>

      {winner === null && pair.length === 2 && (
        <Box textAlign="center" bg="yellow.subtle" p={3} borderRadius="md">
          <Text fontWeight="bold" color="yellow.fg">
            Ничья в паре
          </Text>
        </Box>
      )}

      {error && (
        <Text color="red.fg" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      <Button size="2xl" colorPalette="blue" onClick={handleNext} loading={pending} py={8} fontSize="xl">
        {nextLabel}
      </Button>
    </VStack>
  )
}
