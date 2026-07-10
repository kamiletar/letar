'use client'

/**
 * Экран голосования для ведущего.
 *
 * Показывает имя поэта, тип голосования, оценки судей крупно и сумму.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { WizardStep } from '../../score/_components/wizard/compute-wizard-step'

/** Цвета судей */
const JUDGE_COLOR_MAP: Record<string, string> = {
  RED: 'red',
  BLUE: 'blue',
  GREEN: 'green',
  YELLOW: 'yellow',
  PURPLE: 'purple',
}

interface PresenterVotingProps {
  matchState: MatchSSEState | null
  step: WizardStep
}

export function PresenterVoting({ matchState, step }: PresenterVotingProps) {
  const performerIndex = matchState?.currentPerformerIndex ?? 0
  const currentPerf = matchState?.currentPerformances[performerIndex]
  const judges = matchState?.judges ?? []
  const scores = matchState?.currentVoteScores ?? {}
  const votedCount = judges.filter((j) => j.hasVoted).length
  const totalJudges = judges.length > 0 ? judges.length : 5
  const allVoted = votedCount >= totalJudges && totalJudges > 0
  const dimension = step === 'TEXT_VOTING' ? 'ТЕКСТ' : 'ПОДАЧА'

  // Сумма с отброшенными min/max (как в реальном подсчёте при 5 судьях)
  const scoreValues = Object.values(scores).filter((s): s is number => s !== undefined)
  const allVoted5 = scoreValues.length >= 5

  // Определяем judgeNumber-ы с отброшенными оценками (только когда все 5 проголосовали)
  const outlierJudgeNumbers = new Set<number>()
  if (allVoted5) {
    const entries = Object.entries(scores)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => ({ judgeNumber: Number(k), score: v as number }))
      .sort((a, b) => a.score - b.score || a.judgeNumber - b.judgeNumber)
    outlierJudgeNumbers.add(entries[0].judgeNumber)
    outlierJudgeNumbers.add(entries[entries.length - 1].judgeNumber)
  }

  const total = (() => {
    if (!allVoted5) {
      return scoreValues.reduce((a, b) => a + b, 0)
    }
    const sorted = [...scoreValues].sort((a, b) => a - b)
    return sorted.slice(1, -1).reduce((a, b) => a + b, 0)
  })()

  return (
    <VStack gap={5} align="stretch" py={4}>
      {/* Поэт */}
      {currentPerf ? (
        <Box textAlign="center">
          <Badge colorPalette="blue" size="lg" mb={2}>
            {currentPerf.teamName}
          </Badge>
          <Heading size="3xl" mb={1}>
            🎤 {currentPerf.playerName}
          </Heading>
          <Text color="fg.muted" fontSize="sm">
            Тайм {matchState?.currentHalf ?? 1} · Раунд {matchState?.currentRound ?? 1}
          </Text>
        </Box>
      ) : (
        <Box textAlign="center" py={4}>
          <Text color="fg.muted">Ожидание данных...</Text>
        </Box>
      )}

      {/* Тип голосования */}
      <Box textAlign="center" bg="blue.subtle" p={3} borderRadius="xl" borderWidth="2px" borderColor="blue.solid">
        <Text fontSize="sm" color="fg.muted" mb={1}>
          Оценка
        </Text>
        <Heading size="2xl" color="blue.fg">
          {dimension}
        </Heading>
      </Box>

      {/* Оценки судей — крупно */}
      <Box>
        <HStack justify="space-between" mb={3}>
          <Text fontWeight="bold" fontSize="lg">
            Судьи
          </Text>
          <Badge colorPalette={allVoted ? 'green' : 'yellow'} size="lg" fontSize="md">
            {votedCount} / {totalJudges} проголосовали
          </Badge>
        </HStack>

        <VStack gap={2} align="stretch">
          {(judges.length > 0
            ? [...judges].sort((a, b) => a.judgeNumber - b.judgeNumber)
            : [1, 2, 3, 4, 5].map((n) => ({
                judgeNumber: n,
                name: '',
                color: null,
                hasVoted: false,
                sessionId: String(n),
                manual: true,
              }))
          ).map((judge) => {
            const score = scores[judge.judgeNumber]
            const hasScore = score !== undefined
            const colorPalette = judge.color ? (JUDGE_COLOR_MAP[judge.color] ?? 'gray') : 'gray'
            return (
              <HStack
                key={judge.judgeNumber}
                p={3}
                borderRadius="lg"
                bg={judge.hasVoted ? 'green.subtle' : 'bg.panel'}
                borderWidth="2px"
                borderColor={judge.hasVoted ? 'green.solid' : 'border.muted'}
                justify="space-between"
              >
                <HStack gap={2}>
                  <Badge colorPalette={colorPalette} size="lg" fontSize="md" minW="8" textAlign="center">
                    {judge.judgeNumber}
                  </Badge>
                  <Text fontSize="md" fontWeight="medium">
                    {judge.name || `Судья ${judge.judgeNumber}`}
                  </Text>
                </HStack>
                {hasScore ? (
                  <Text
                    fontSize="3xl"
                    fontWeight="bold"
                    color={outlierJudgeNumbers.has(judge.judgeNumber) ? 'red.fg' : 'green.fg'}
                    fontFamily="mono"
                    textDecoration={outlierJudgeNumbers.has(judge.judgeNumber) ? 'line-through' : undefined}
                  >
                    {score}
                  </Text>
                ) : (
                  <Text fontSize="2xl" color="fg.subtle">
                    ○
                  </Text>
                )}
              </HStack>
            )
          })}
        </VStack>
      </Box>

      {/* Сумма — крупно, появляется когда есть хоть одна оценка */}
      {scoreValues.length > 0 && (
        <Box
          textAlign="center"
          bg={allVoted ? 'green.subtle' : 'bg.panel'}
          borderRadius="xl"
          borderWidth="2px"
          borderColor={allVoted ? 'green.solid' : 'border.muted'}
          p={5}
        >
          <Text fontSize="sm" color="fg.muted" mb={1}>
            {allVoted ? 'Итоговая сумма' : `Сумма (${scoreValues.length} из ${totalJudges})`}
          </Text>
          <Text fontSize="7xl" fontWeight="bold" fontFamily="mono" color={allVoted ? 'green.fg' : 'fg'} lineHeight="1">
            {total}
          </Text>
        </Box>
      )}
    </VStack>
  )
}
