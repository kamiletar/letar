'use client'

/**
 * Прогресс голосования судей с цветовой идентификацией
 *
 * Показывает именной прогресс с цветными бейджами:
 * "🔴 Анна ✓, 🔵 Дмитрий ✓, ожидание: 🟢 Олег..."
 * Подсвечивает красным судей, не проголосовавших за 30 секунд.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { JUDGE_COLORS } from '@/lib/judge-colors'
import { Badge, Circle, HStack, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

/** Таймаут судьи в секундах */
const JUDGE_TIMEOUT_SEC = 30

interface JudgeProgressProps {
  matchState: MatchSSEState | null
}

export function JudgeProgress({ matchState }: JudgeProgressProps) {
  const [now, setNow] = useState(Date.now())

  const isVotingActive = matchState?.phase === 'TEXT_VOTING' || matchState?.phase === 'DELIVERY_VOTING'

  // Обновляем время каждую секунду для подсветки таймаута
  useEffect(() => {
    if (!isVotingActive) {
      return
    }

    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isVotingActive])

  if (!matchState || matchState.judges.length === 0) {
    return null
  }

  const votedCount = matchState.judges.filter((j) => j.hasVoted).length
  const totalJudges = matchState.judges.length
  const allVoted = votedCount === totalJudges && totalJudges > 0

  // Время с момента открытия голосования
  const elapsedSec = matchState.votingOpenedAt ? (now - matchState.votingOpenedAt) / 1000 : 0
  const isTimedOut = isVotingActive && elapsedSec > JUDGE_TIMEOUT_SEC

  return (
    <VStack gap={2} w="full" align="start">
      {isVotingActive && (
        <HStack justify="space-between" w="full">
          <Text fontSize="sm" color="fg.muted">
            Голосование: {votedCount}/{totalJudges}
          </Text>
          {allVoted && (
            <Badge colorPalette="green" size="sm">
              Все проголосовали
            </Badge>
          )}
        </HStack>
      )}

      <HStack gap={2} flexWrap="wrap" w="full">
        {matchState.judges.map((judge) => {
          const voted = judge.hasVoted
          const timedOut = isVotingActive && !voted && isTimedOut
          const colorConfig = judge.color ? JUDGE_COLORS[judge.color] : null

          return (
            <Badge
              key={judge.judgeNumber}
              colorPalette={voted ? 'green' : timedOut ? 'red' : (colorConfig?.chakra ?? 'gray')}
              variant={voted ? 'solid' : 'outline'}
              size="lg"
              px={3}
              py={1}
            >
              <HStack gap={1}>
                {colorConfig && <Circle size="10px" bg={colorConfig.hex} />}
                <Text>
                  {voted ? '✓' : timedOut ? '⏰' : '…'} {judge.name}
                </Text>
              </HStack>
            </Badge>
          )
        })}
      </HStack>
    </VStack>
  )
}
