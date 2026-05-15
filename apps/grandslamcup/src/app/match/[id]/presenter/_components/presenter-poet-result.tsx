'use client'

/**
 * Экран POET_RESULT для ведущего.
 *
 * Показывает результат поэта крупно + кнопка «Следующий поэт» / «Итоги пары»
 * (дублирует скорера).
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Button, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { finishPairAction, nextRoundAction } from '../../score/_actions/scorer.action'

interface PerformanceData {
  id: string
  half: number
  roundNumber: number
  playerName: string
  teamSeasonId: string
  textScores: number[]
  deliveryScores: number[]
  textAdjusted: number | null
  deliveryAdjusted: number | null
  totalScore: number | null
  votes: Array<{ judgeName: string; judgeNumber: number; dimension: string; score: number }>
}

interface PresenterPoetResultProps {
  match: {
    id: string
    homeTeam: { id: string; name: string }
    awayTeam: { id: string; name: string }
    performances: PerformanceData[]
  }
  matchState: MatchSSEState | null
}

export function PresenterPoetResult({ match, matchState }: PresenterPoetResultProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Обновляем данные чтобы получить актуальные оценки
  useEffect(() => {
    router.refresh()
  }, [router])

  const half = matchState?.currentHalf ?? 1
  const performerIndex = matchState?.currentPerformerIndex ?? 0
  const currentPerf = matchState?.currentPerformances[performerIndex]
  const isFirstPoet = performerIndex === 0

  const perf = currentPerf ? match.performances.find((p) => p.id === currentPerf.performanceId) : null

  const handleNext = useCallback(async () => {
    setPending(true)
    setError(null)
    const res = isFirstPoet ? await nextRoundAction(match.id) : await finishPairAction(match.id)
    setPending(false)
    if (!res.success) {
      setError('Не удалось перейти дальше')
      return
    }
    router.refresh()
  }, [match.id, router, isFirstPoet])

  if (!perf || !currentPerf) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="fg.muted" fontSize="xl">
          Загрузка результатов...
        </Text>
        <Button mt={4} colorPalette="blue" onClick={handleNext} loading={pending}>
          Следующий поэт →
        </Button>
      </Box>
    )
  }

  const isHomeTeam = perf.teamSeasonId === match.homeTeam.id
  const teamName = isHomeTeam ? match.homeTeam.name : match.awayTeam.name
  const teamPalette = isHomeTeam ? 'blue' : 'orange'
  const nextLabel = isFirstPoet ? '→ Следующий поэт' : '→ Итоги пары'

  return (
    <VStack gap={5} align="stretch" py={4}>
      <Box textAlign="center">
        <Badge colorPalette={teamPalette} size="lg" mb={2}>
          {teamName}
        </Badge>
        <Heading size="3xl" mb={1}>
          🎤 {perf.playerName}
        </Heading>
        <Text fontSize="sm" color="fg.muted">
          Тайм {half} · Раунд {perf.roundNumber}
        </Text>
      </Box>

      {/* Итоговый балл */}
      <Box textAlign="center" bg="blue.subtle" p={6} borderRadius="xl" borderWidth="2px" borderColor="blue.solid">
        <Text fontSize="sm" color="fg.muted" mb={1}>
          Итоговый балл
        </Text>
        <Heading size="5xl" color="blue.fg">
          {perf.totalScore ?? '—'}
        </Heading>
      </Box>

      {/* Категории */}
      <VStack gap={3} align="stretch">
        <ScoreBlock
          label="📜 Текст"
          scores={perf.textScores}
          adjusted={perf.textAdjusted}
          votes={perf.votes.filter((v) => v.dimension === 'TEXT')}
        />
        <ScoreBlock
          label="🎭 Подача"
          scores={perf.deliveryScores}
          adjusted={perf.deliveryAdjusted}
          votes={perf.votes.filter((v) => v.dimension === 'DELIVERY')}
        />
      </VStack>

      {error && (
        <Text color="red.fg" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      <Button size="2xl" colorPalette="green" onClick={handleNext} loading={pending} py={8} fontSize="xl">
        {nextLabel}
      </Button>
    </VStack>
  )
}

function ScoreBlock({
  label,
  scores,
  adjusted,
  votes,
}: {
  label: string
  scores: number[]
  adjusted: number | null
  votes: Array<{ judgeName: string; judgeNumber: number; score: number }>
}) {
  const hasOutliers = scores.length >= 5
  const outlierJudgeNumbers = new Set<number>()
  if (hasOutliers && votes.length >= 5) {
    const sorted = [...votes].sort((a, b) => a.score - b.score || a.judgeNumber - b.judgeNumber)
    outlierJudgeNumbers.add(sorted[0].judgeNumber)
    outlierJudgeNumbers.add(sorted[sorted.length - 1].judgeNumber)
  }

  return (
    <Box p={4} bg="bg.panel" borderRadius="lg" borderWidth="1px" borderColor="border.muted">
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontWeight="bold" fontSize="md">
          {label}
        </Text>
        <HStack gap={1}>
          {hasOutliers && (
            <Text fontSize="xs" color="fg.muted">
              (без min/max)
            </Text>
          )}
          <Badge colorPalette="blue" size="lg" fontSize="md" px={3}>
            {adjusted ?? '—'}
          </Badge>
        </HStack>
      </Flex>
      <VStack gap={2} align="stretch">
        {votes.length > 0
          ? votes
              .slice()
              .sort((a, b) => a.judgeNumber - b.judgeNumber)
              .map((v) => {
                const isOutlier = outlierJudgeNumbers.has(v.judgeNumber)
                return (
                  <Flex key={v.judgeNumber} justify="space-between" align="center">
                    <Text fontSize="sm" color={isOutlier ? 'fg.muted' : 'fg'}>
                      Судья {v.judgeNumber}
                      {v.judgeName ? ` — ${v.judgeName}` : ''}
                    </Text>
                    <Badge
                      colorPalette={isOutlier ? 'red' : 'green'}
                      variant={isOutlier ? 'outline' : 'solid'}
                      size="md"
                    >
                      {v.score}
                      {isOutlier && ' ⛔'}
                    </Badge>
                  </Flex>
                )
              })
          : scores.map((s, i) => (
              <Flex key={i} justify="space-between" align="center">
                <Text fontSize="sm" color="fg.muted">
                  Судья {i + 1}
                </Text>
                <Badge colorPalette="gray" size="md">
                  {s}
                </Badge>
              </Flex>
            ))}
      </VStack>
    </Box>
  )
}
