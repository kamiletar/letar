'use client'

/**
 * Табло счёта матча — домашние vs гостевые
 */

import type { VotingPhase } from '@/lib/sse/match-state'
import { Badge, Box, Flex, Heading, Text } from '@chakra-ui/react'

const PHASE_LABELS: Record<VotingPhase, string> = {
  IDLE: 'Ожидание',
  PERFORMING: 'Выступление',
  TEXT_VOTING: 'Голосование: ТЕКСТ',
  TEXT_COMPLETE: 'Текст подсчитан',
  DELIVERY_VOTING: 'Голосование: ПОДАЧА',
  DELIVERY_COMPLETE: 'Подача подсчитана',
  ROUND_COMPLETE: 'Раунд завершён',
  POET_RESULT: 'Результат поэта',
  HALF_SUMMARY: 'Итоги тайма',
  INTERMISSION: 'Перерыв',
}

const PHASE_COLORS: Record<VotingPhase, string> = {
  IDLE: 'gray',
  PERFORMING: 'teal',
  TEXT_VOTING: 'blue',
  TEXT_COMPLETE: 'green',
  DELIVERY_VOTING: 'purple',
  DELIVERY_COMPLETE: 'green',
  ROUND_COMPLETE: 'orange',
  POET_RESULT: 'blue',
  HALF_SUMMARY: 'green',
  INTERMISSION: 'gray',
}

interface ScoreboardProps {
  homeTeamName: string
  awayTeamName: string
  homeScore: number
  awayScore: number
  matchStatus: string
  phase: VotingPhase
  currentHalf: number
  currentRound: number
}

export function Scoreboard({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  matchStatus,
  phase,
  currentHalf,
  currentRound,
}: ScoreboardProps) {
  return (
    <Box p={6} mb={4} borderRadius="xl" bg="bg.subtle" borderWidth={1} borderColor="border">
      {/* Счёт */}
      <Flex justify="space-between" align="center" mb={4}>
        <VoteTeamBlock name={homeTeamName} score={homeScore} />
        <Text fontSize="2xl" fontWeight="bold" color="fg.muted">
          :
        </Text>
        <VoteTeamBlock name={awayTeamName} score={awayScore} align="right" />
      </Flex>

      {/* Статус */}
      <Flex justify="center" gap={3} flexWrap="wrap">
        {matchStatus === 'LIVE' && (
          <>
            <Badge colorPalette="red" size="lg">
              LIVE
            </Badge>
            <Badge colorPalette="blue">Тайм {currentHalf}</Badge>
            <Badge colorPalette="blue">Раунд {currentRound}/5</Badge>
            <Badge colorPalette={PHASE_COLORS[phase]}>{PHASE_LABELS[phase]}</Badge>
          </>
        )}
        {matchStatus === 'SCHEDULED' && (
          <Badge colorPalette="gray" size="lg">
            Не начат
          </Badge>
        )}
        {matchStatus === 'FINISHED' && (
          <Badge colorPalette="green" size="lg">
            Завершён
          </Badge>
        )}
      </Flex>
    </Box>
  )
}

function VoteTeamBlock({ name, score, align = 'left' }: { name: string; score: number; align?: 'left' | 'right' }) {
  return (
    <Flex direction="column" align={align === 'right' ? 'flex-end' : 'flex-start'}>
      <Text fontSize="sm" color="fg.muted" mb={1}>
        {name}
      </Text>
      <Heading size="3xl">{score}</Heading>
    </Flex>
  )
}
