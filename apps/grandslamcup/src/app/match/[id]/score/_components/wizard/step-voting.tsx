'use client'

/**
 * Шаги 5-6: Голосование за ТЕКСТ / ПОДАЧУ.
 *
 * Один компонент для двух фаз — отличаются только dimension. Показывает:
 * - Имя выступающего крупно
 * - Таймер выступления (read-only, управление через presenter actions или inline)
 * - Блоки ручного ввода ScorerVoteInput (B9)
 * - Прогресс голосования судей
 * - Кнопки «Готово» и «Завершить с неполным жюри»
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Button, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  confirmPoetResultAction,
  forceCompleteVotingAction,
  startDeliveryVotingAction,
} from '../../_actions/scorer.action'
import { CardDialog } from '../card-dialog'
import type { MatchData } from '../scorer-client'
import { ScorerVoteInput } from '../scorer-vote-input'

interface StepVotingProps {
  match: MatchData
  matchState: MatchSSEState | null
  dimension: 'TEXT' | 'DELIVERY'
}

export function StepVoting({ match, matchState, dimension }: StepVotingProps) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [forceUnlockedAt, setForceUnlockedAt] = useState<number | null>(null)
  // Текущие оценки введённые скорером (из ScorerVoteInput)
  const [enteredScores, setEnteredScores] = useState<Record<number, number | null>>({})
  const canGoNextRef = useRef(false)

  const judges = matchState?.judges ?? []
  const phase = matchState?.phase ?? 'IDLE'
  const currentPerformerIndex = matchState?.currentPerformerIndex ?? 0
  const currentPerf = matchState?.currentPerformances[currentPerformerIndex]
  const votingOpenedAt = matchState?.votingOpenedAt ?? null

  const votedCount = judges.filter((j) => j.hasVoted).length
  const allVoted = votedCount >= 5

  // Разблокируем кнопку «Завершить с неполным жюри» через 30 сек после старта голосования
  useEffect(() => {
    if (!votingOpenedAt) {
      return
    }
    const elapsed = Date.now() - votingOpenedAt
    if (elapsed >= 30_000) {
      setForceUnlockedAt(votingOpenedAt)
      return
    }
    const timeoutId = setTimeout(() => setForceUnlockedAt(votingOpenedAt), 30_000 - elapsed)
    return () => clearTimeout(timeoutId)
  }, [votingOpenedAt])

  // Определяем цвет команды
  const isHomeTeam = currentPerf?.teamSeasonId === match.homeTeam.id
  const teamColorPalette = isHomeTeam ? 'blue' : 'orange'

  const isTextComplete = phase === 'TEXT_COMPLETE'
  const isDeliveryComplete = phase === 'DELIVERY_COMPLETE'
  const canGoNext = dimension === 'TEXT' ? isTextComplete : isDeliveryComplete
  canGoNextRef.current = canGoNext

  // Считаем промежуточную сумму из введённых оценок
  const liveScore = useMemo(() => {
    const values = Object.values(enteredScores).filter((v): v is number => v !== null)
    if (values.length === 0) {
      return null
    }
    if (values.length >= 5) {
      // Отбрасываем один min и один max
      const sorted = [...values].sort((a, b) => a - b)
      return sorted.slice(1, sorted.length - 1).reduce((s, v) => s + v, 0)
    }
    return values.reduce((s, v) => s + v, 0)
  }, [enteredScores])

  const handleNextDimension = useCallback(async () => {
    setPending('next')
    setError(null)
    if (dimension === 'TEXT') {
      const res = await startDeliveryVotingAction(match.id)
      if (!res.success) {
        setError(res.error ?? 'Не удалось перейти к подаче')
      }
    } else {
      // Подача готова → переходим на POET_RESULT (скорер видит итоговые оценки)
      const res = await confirmPoetResultAction(match.id)
      if (!res.success) {
        setError('Не удалось перейти к результату поэта')
      }
    }
    setPending(null)
    router.refresh()
  }, [dimension, match.id, router])

  // Enter подтверждает переход когда кнопка активна
  const handleNextDimensionRef = useRef(handleNextDimension)
  handleNextDimensionRef.current = handleNextDimension

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return
      if (!canGoNextRef.current) return
      e.preventDefault()
      void handleNextDimensionRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleForceComplete = useCallback(async () => {
    setPending('force')
    setError(null)
    const res = await forceCompleteVotingAction(match.id, dimension)
    setPending(null)
    if (!res.success) {
      setError(res.error ?? 'Не удалось завершить')
      return
    }
    router.refresh()
  }, [dimension, match.id, router])

  if (!currentPerf) {
    return <Text color="fg.muted">Ожидание данных о выступающем...</Text>
  }

  return (
    <VStack gap={5} align="stretch" py={2}>
      {/* Имя выступающего */}
      <Box textAlign="center">
        <Badge colorPalette={teamColorPalette} size="lg" mb={2}>
          {currentPerf.teamName}
        </Badge>
        <Heading size="2xl" lineClamp={2}>
          🎤 {currentPerf.playerName}
        </Heading>
        <Text fontSize="sm" color="fg.muted" mt={1}>
          Оценка: {dimension === 'TEXT' ? '📜 ТЕКСТ' : '🎭 ПОДАЧА'}
        </Text>
      </Box>

      {/* Прогресс судей */}
      <Box bg="bg.subtle" p={3} borderRadius="md">
        <Flex justify="space-between" align="center" mb={2}>
          <Text fontSize="sm" fontWeight="medium">
            Голосование: {votedCount} из 5 судей
          </Text>
          <HStack gap={2}>
            {liveScore !== null && (
              <Badge colorPalette="blue" size="md" fontSize="md" px={3}>
                ∑ {liveScore}
              </Badge>
            )}
            <CardDialog
              matchId={match.id}
              performanceId={currentPerf.performanceId}
              playerName={currentPerf.playerName}
              onIssued={() => router.refresh()}
            />
          </HStack>
        </Flex>
        <ScorerVoteInput
          matchId={match.id}
          performanceId={currentPerf.performanceId}
          dimension={dimension}
          judges={judges}
          onScoresChange={setEnteredScores}
        />
      </Box>

      {error && (
        <Text color="red.fg" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      {/* Кнопки действий */}
      <VStack gap={2} align="stretch">
        {canGoNext ? (
          <Button
            size="xl"
            colorPalette="green"
            onClick={handleNextDimension}
            loading={pending === 'next'}
            py={7}
            fontSize="lg"
          >
            ✓ {dimension === 'TEXT' ? 'Текст оценён — к подаче' : 'Показать результат поэта'}
          </Button>
        ) : (
          <Box textAlign="center" bg="yellow.subtle" p={3} borderRadius="md">
            <Text fontSize="sm" color="fg.muted">
              Ждём все 5 оценок {allVoted ? '(фаза ещё не обновилась)' : ''}
            </Text>
          </Box>
        )}

        {!canGoNext && forceUnlockedAt && (
          <Button
            size="md"
            variant="outline"
            colorPalette="orange"
            onClick={handleForceComplete}
            loading={pending === 'force'}
          >
            ⚠ Завершить с неполным жюри
          </Button>
        )}
      </VStack>
    </VStack>
  )
}
