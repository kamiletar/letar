'use client'

/**
 * Кнопки голосования 1-5 (mobile-first, крупные)
 *
 * После голосования кнопки блокируются и показывается подтверждение.
 */

import type { ConnectionStatus } from '@/app/_hooks/use-match-sse'
import { JUDGE_COLORS, type JudgeColor } from '@/lib/judge-colors'
import { Box, Button, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { submitVoteAction } from '../_actions/judge.action'

interface VoteButtonsProps {
  matchId: string
  performanceId: string
  dimension: 'TEXT' | 'DELIVERY'
  playerName: string
  judgeName: string
  judgeNumber: number
  /** Цвет судьи для header strip */
  judgeColor: JudgeColor | null
  connectionStatus: ConnectionStatus
}

const DIMENSION_LABELS = {
  TEXT: 'ТЕКСТ',
  DELIVERY: 'ПОДАЧУ',
} as const

export function VoteButtons({
  matchId,
  performanceId,
  dimension,
  playerName,
  judgeName,
  judgeNumber,
  judgeColor,
  connectionStatus,
}: VoteButtonsProps) {
  const colorConfig = judgeColor ? JUDGE_COLORS[judgeColor] : null
  const [voted, setVoted] = useState(false)
  const [votedScore, setVotedScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleVote = useCallback(
    async (score: number) => {
      setLoading(true)
      setError(null)

      const result = await submitVoteAction(matchId, performanceId, dimension, score)

      setLoading(false)

      if (result.success) {
        setVoted(true)
        setVotedScore(score)
      } else {
        setError(result.error ?? 'Ошибка голосования')
      }
    },
    [matchId, performanceId, dimension],
  )

  // Подтверждение голоса с возможностью изменить
  if (voted) {
    return (
      <VStack gap={4} w="full">
        <Heading size="lg" textAlign="center" color="green.500">
          ✓
        </Heading>
        <Text textAlign="center" fontSize="xl" fontWeight="bold">
          Ваша оценка: {votedScore}
        </Text>
        <Text textAlign="center" color="fg.muted">
          Ожидание других судей...
        </Text>
        <Button
          size="sm"
          variant="outline"
          colorPalette="orange"
          onClick={() => {
            setVoted(false)
            setVotedScore(null)
          }}
        >
          Изменить оценку
        </Button>
      </VStack>
    )
  }

  return (
    <VStack gap={4} w="full">
      {/* Цветная полоска судьи */}
      {colorConfig && <Box w="full" h="6px" borderRadius="full" bg={colorConfig.hex} />}

      {/* Заголовок */}
      <VStack gap={1}>
        <Text fontSize="sm" color="fg.muted">
          {colorConfig ? `${colorConfig.emoji} ${colorConfig.name}` : `Судья #${judgeNumber}`}: {judgeName}
        </Text>
        <Heading size="lg" textAlign="center">
          Оцените {DIMENSION_LABELS[dimension]}
        </Heading>
        <Text fontSize="xl" fontWeight="bold" textAlign="center">
          {playerName}
        </Text>
      </VStack>

      {/* Кнопки 1-5 */}
      <SimpleGrid columns={5} gap={2} w="full">
        {[1, 2, 3, 4, 5].map((score) => (
          <Button
            key={score}
            size="2xl"
            variant="outline"
            height="80px"
            fontSize="2xl"
            fontWeight="bold"
            disabled={loading || connectionStatus !== 'connected'}
            onClick={() => handleVote(score)}
          >
            {score}
          </Button>
        ))}
      </SimpleGrid>

      {error && (
        <Text color="red.500" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      {connectionStatus !== 'connected' && (
        <Box p={2} borderRadius="md" bg="yellow.subtle">
          <Text fontSize="sm" textAlign="center" color="yellow.fg">
            Подключение к серверу...
          </Text>
        </Box>
      )}
    </VStack>
  )
}
