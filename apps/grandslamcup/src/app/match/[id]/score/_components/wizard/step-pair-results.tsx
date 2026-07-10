'use client'

/**
 * Шаг 7: Результаты завершённой пары.
 *
 * Показывает разбор обеих выступлений пары: оценки судей, отбрасываемые min/max,
 * суммы по категориям, итог. Определяет победителя пары.
 * Кнопка «Следующая пара» вызывает nextRoundAction.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Button, Flex, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { nextRoundAction, showHalfSummaryAction } from '../../_actions/scorer.action'
import type { MatchData } from '../scorer-client'

interface StepPairResultsProps {
  match: MatchData
  matchState: MatchSSEState | null
}

export function StepPairResults({ match, matchState }: StepPairResultsProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const half = matchState?.currentHalf ?? 1
  const round = matchState?.currentRound ?? 1

  // Находим обе performances текущего раунда
  const pair = match.performances.filter((p) => p.half === half && p.roundNumber === round).slice(0, 2)

  const isLastPairOfHalf = round >= 5

  const handleNext = useCallback(async () => {
    setPending(true)
    setError(null)
    let res: { success: boolean; error?: string }
    if (isLastPairOfHalf) {
      // Последняя пара тайма → явная фаза HALF_SUMMARY (не пропускаем PAIR_RESULTS)
      res = await showHalfSummaryAction(match.id)
    } else {
      res = await nextRoundAction(match.id)
    }
    setPending(false)
    if (!res.success) {
      setError('Не удалось перейти дальше')
      return
    }
    router.refresh()
  }, [match.id, router, isLastPairOfHalf])

  // Enter нажимает кнопку «Следующая пара»
  const handleNextRef = useRef(handleNext)
  handleNextRef.current = handleNext
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return
      e.preventDefault()
      void handleNextRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // Определяем победителя пары по totalScore
  const winner =
    pair.length === 2 && pair[0].totalScore !== null && pair[1].totalScore !== null
      ? pair[0].totalScore > pair[1].totalScore
        ? pair[0]
        : pair[1].totalScore > pair[0].totalScore
          ? pair[1]
          : null
      : null

  return (
    <VStack gap={5} align="stretch" py={4}>
      <Box textAlign="center">
        <Heading size="xl" mb={2}>
          Пара {round} завершена
        </Heading>
        <Text color="fg.muted">Тайм {half}</Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {pair.map((perf) => {
          const isWinner = winner?.id === perf.id
          return (
            <Box
              key={perf.id}
              p={5}
              borderRadius="xl"
              borderWidth="2px"
              borderColor={isWinner ? 'green.solid' : 'border.muted'}
              bg={isWinner ? 'green.subtle' : 'bg.panel'}
            >
              <Flex justify="space-between" align="start" mb={3}>
                <Heading size="xl" lineClamp={2}>
                  {perf.playerName}
                </Heading>
                {isWinner && (
                  <Badge colorPalette="green" size="md">
                    🏆 Победил
                  </Badge>
                )}
              </Flex>
              <VStack gap={3} align="stretch" mt={3}>
                <ScoreBreakdown label="📜 Текст" scores={perf.textScores} adjusted={perf.textAdjusted} />
                <ScoreBreakdown label="🎭 Подача" scores={perf.deliveryScores} adjusted={perf.deliveryAdjusted} />
                <Flex justify="space-between" align="center" pt={3} borderTopWidth="1px" borderColor="border.muted">
                  <Text fontWeight="bold" fontSize="xl">
                    Итого:
                  </Text>
                  <Badge colorPalette="blue" size="xl" fontSize="2xl" px={4} py={2}>
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

      <Button size="xl" colorPalette="blue" onClick={handleNext} loading={pending} py={7} fontSize="lg">
        → {isLastPairOfHalf ? `К итогам тайма ${half}` : `Следующая пара (${round + 1}/5)`}
      </Button>
    </VStack>
  )
}

function ScoreBreakdown({ label, scores, adjusted }: { label: string; scores: number[]; adjusted: number | null }) {
  // Вычисляем ровно один outlier-min и один outlier-max по индексу
  const outlierIndices = new Set<number>()
  if (scores.length >= 5) {
    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => a.s - b.s || a.i - b.i)
    outlierIndices.add(indexed[0].i)
    outlierIndices.add(indexed[indexed.length - 1].i)
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontSize="sm" color="fg.muted" fontWeight="medium">
          {label}
        </Text>
        <Badge colorPalette="gray" size="md" fontSize="md">
          {adjusted ?? '—'}
        </Badge>
      </Flex>
      {scores.length > 0 && (
        <HStack gap={2} wrap="wrap">
          {scores.map((s, i) => {
            const isOutlier = outlierIndices.has(i)
            return (
              <Badge
                key={i}
                size="md"
                fontSize="md"
                colorPalette={isOutlier ? 'red' : 'green'}
                variant={isOutlier ? 'outline' : 'solid'}
              >
                {s}
                {isOutlier && '⛔'}
              </Badge>
            )
          })}
        </HStack>
      )}
    </Box>
  )
}
