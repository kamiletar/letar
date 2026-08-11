'use client'

/**
 * Шаг POET_RESULT: результат одного поэта после завершения голосования.
 *
 * Показывается после фазы DELIVERY_COMPLETE — пока nextRoundAction ещё не вызван.
 * Отображает: имя поэта, список оценок судей по тексту и подаче,
 * суммы с отброшенными min/max, итоговый балл.
 * Кнопка «Следующий поэт» вызывает nextRoundAction → фаза IDLE.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Button, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { finishPairAction, nextRoundAction } from '../../_actions/scorer.action'
import type { MatchData } from '../scorer-client'

interface StepPoetResultProps {
  match: MatchData
  matchState: MatchSSEState | null
}

export function StepPoetResult({ match, matchState }: StepPoetResultProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Оценки подачи записались в БД по SSE, но match.performances — серверный снапшот.
  // Обновляем страницу при монтировании чтобы получить актуальные данные из БД.
  useEffect(() => {
    router.refresh()
  }, [router])

  const half = matchState?.currentHalf ?? 1
  const performerIndex = matchState?.currentPerformerIndex ?? 0
  const currentPerf = matchState?.currentPerformances[performerIndex]

  // Находим performance в данных матча по performanceId из matchState
  const perf = currentPerf ? match.performances.find((p) => p.id === currentPerf.performanceId) : null

  // Определяем: это первый поэт пары или второй?
  const isFirstPoet = performerIndex === 0

  // Enter нажимает кнопку «Следующий поэт / Итоги пары»
  const handleNextRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') { return }
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') { return }
      e.preventDefault()
      void handleNextRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleNext = useCallback(async () => {
    setPending(true)
    setError(null)
    let res: { success: boolean; error?: string }
    if (isFirstPoet) {
      // Первый поэт → переключиться на второго (performerIndex=1, phase=IDLE)
      res = await nextRoundAction(match.id)
    } else {
      // Второй поэт → пометить пару завершённой (phase=ROUND_COMPLETE → PAIR_RESULTS)
      res = await finishPairAction(match.id)
    }
    setPending(false)
    if (!res.success) {
      setError('Не удалось перейти дальше')
      return
    }
    router.refresh()
  }, [match.id, router, isFirstPoet])
  handleNextRef.current = handleNext

  if (!perf || !currentPerf) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="fg.muted">Загрузка результатов...</Text>
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
      {/* Заголовок */}
      <Box textAlign="center">
        <Badge colorPalette={teamPalette} size="lg" mb={2}>
          {teamName}
        </Badge>
        <Heading size="2xl" mb={1}>
          🎤 {perf.playerName}
        </Heading>
        <Text fontSize="sm" color="fg.muted">
          Тайм {half} · Раунд {perf.roundNumber}
        </Text>
      </Box>

      {/* Итоговый балл — крупно */}
      <Box textAlign="center" bg="blue.subtle" p={4} borderRadius="xl" borderWidth="2px" borderColor="blue.solid">
        <Text fontSize="sm" color="fg.muted" mb={1}>
          Итоговый балл
        </Text>
        <Heading size="4xl" color="blue.fg">
          {perf.totalScore ?? '—'}
        </Heading>
      </Box>

      {/* Разбор по категориям */}
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

  // Вычисляем ровно один outlier-min и один outlier-max по judgeNumber.
  // Сортируем по score (стабильно), берём позицию 0 (min) и последнюю (max).
  const outlierJudgeNumbers = new Set<number>()
  if (hasOutliers && votes.length >= 5) {
    const sorted = [...votes].sort((a, b) => a.score - b.score || a.judgeNumber - b.judgeNumber)
    outlierJudgeNumbers.add(sorted[0].judgeNumber) // один минимум
    outlierJudgeNumbers.add(sorted[sorted.length - 1].judgeNumber) // один максимум
  }

  // Для случая без votes — отбрасываем по индексу в отсортированном массиве
  const outlierIndices = new Set<number>()
  if (hasOutliers && votes.length === 0 && scores.length >= 5) {
    const indexed = scores.map((s, i) => ({ s, i })).sort((a, b) => a.s - b.s || a.i - b.i)
    outlierIndices.add(indexed[0].i)
    outlierIndices.add(indexed[indexed.length - 1].i)
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

      {/* Оценки судей */}
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
          : scores.map((s, i) => {
            const isOutlier = outlierIndices.has(i)
            return (
              <Flex key={i} justify="space-between" align="center">
                <Text fontSize="sm" color={isOutlier ? 'fg.muted' : 'fg'}>
                  Судья {i + 1}
                </Text>
                <Badge colorPalette={isOutlier ? 'red' : 'green'} variant={isOutlier ? 'outline' : 'solid'} size="md">
                  {s}
                  {isOutlier && ' ⛔'}
                </Badge>
              </Flex>
            )
          })}
      </VStack>
    </Box>
  )
}
