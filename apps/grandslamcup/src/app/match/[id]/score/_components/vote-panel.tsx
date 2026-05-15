'use client'

/**
 * Панель управления голосованием — выбор поэта, старт голосования, результаты
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import type { CurrentPerformance, VotingPhase } from '@/lib/sse/match-state'
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import {
  finishHalfAction,
  finishMatchAction,
  forceCompleteVotingAction,
  nextRoundAction,
  setCurrentPerformerAction,
  startDeliveryVotingAction,
  startMatchAction,
  startTextVotingAction,
} from '../_actions/scorer.action'
import { CardDialog } from './card-dialog'
import { ScoreEditorDialog } from './score-editor-dialog'
import { ScorerVoteInput } from './scorer-vote-input'

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
}

interface VotePanelProps {
  matchId: string
  matchStatus: string
  homeTeam: {
    id: string
    name: string
    players: Array<{ id: string; name: string; status: string }>
  }
  awayTeam: {
    id: string
    name: string
    players: Array<{ id: string; name: string; status: string }>
  }
  phase: VotingPhase
  currentPerformances: CurrentPerformance[]
  currentPerformerIndex: number
  judges: MatchSSEState['judges']
  performances: PerformanceData[]
}

export function VotePanel({
  matchId,
  matchStatus,
  homeTeam,
  awayTeam,
  phase,
  currentPerformances,
  currentPerformerIndex,
  judges,
  performances,
}: VotePanelProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = useCallback(
    async (key: string, action: () => Promise<{ success: boolean }>) => {
      setLoading(key)
      await action()
      setLoading(null)
      router.refresh()
    },
    [router]
  )

  const currentPerf = currentPerformances[currentPerformerIndex]

  return (
    <Box p={4} borderRadius="xl" bg="bg.subtle" borderWidth={1} borderColor="border">
      <Heading size="md" mb={3}>
        Управление
      </Heading>

      {/* Не начат — кнопка старта */}
      {matchStatus === 'SCHEDULED' && (
        <Button
          colorPalette="green"
          size="lg"
          width="full"
          loading={loading === 'start'}
          onClick={() => handleAction('start', () => startMatchAction(matchId))}
        >
          Начать матч
        </Button>
      )}

      {/* Матч идёт */}
      {matchStatus === 'LIVE' && (
        <VStack gap={4} align="stretch">
          {/* Текущий выступающий */}
          {currentPerf && (
            <Box p={3} borderRadius="md" bg="blue.subtle" borderWidth={1} borderColor="blue.muted">
              <Text fontWeight="bold" fontSize="lg">
                Выступает: {currentPerf.playerName}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {currentPerf.teamName} — Тайм {currentPerf.half}, Раунд {currentPerf.roundNumber}
              </Text>
            </Box>
          )}

          {/* Выбор поэта (когда IDLE) */}
          {phase === 'IDLE' && !currentPerf && (
            <VStack gap={3} align="stretch">
              <Text fontWeight="medium">Выберите поэта для выступления:</Text>
              <SimpleGrid columns={2} gap={3}>
                <TeamPlayerList
                  team={homeTeam}
                  matchId={matchId}
                  onSelectPlayer={async (playerId, playerName) => {
                    await handleAction('player', () =>
                      setCurrentPerformerAction(matchId, playerId, playerName, homeTeam.id, homeTeam.name)
                    )
                  }}
                  loading={loading === 'player'}
                />
                <TeamPlayerList
                  team={awayTeam}
                  matchId={matchId}
                  onSelectPlayer={async (playerId, playerName) => {
                    await handleAction('player', () =>
                      setCurrentPerformerAction(matchId, playerId, playerName, awayTeam.id, awayTeam.name)
                    )
                  }}
                  loading={loading === 'player'}
                />
              </SimpleGrid>
            </VStack>
          )}

          {/* Кнопки голосования */}
          {currentPerf && phase === 'IDLE' && (
            <Button
              colorPalette="blue"
              size="lg"
              loading={loading === 'textVote'}
              onClick={() => handleAction('textVote', () => startTextVotingAction(matchId))}
            >
              ▶ Голосование: ТЕКСТ
            </Button>
          )}

          {phase === 'TEXT_COMPLETE' && (
            <Button
              colorPalette="purple"
              size="lg"
              loading={loading === 'deliveryVote'}
              onClick={() => handleAction('deliveryVote', () => startDeliveryVotingAction(matchId))}
            >
              ▶ Голосование: ПОДАЧА
            </Button>
          )}

          {(phase === 'DELIVERY_COMPLETE' || phase === 'ROUND_COMPLETE') && (
            <Button
              colorPalette="orange"
              size="lg"
              loading={loading === 'next'}
              onClick={() => handleAction('next', () => nextRoundAction(matchId))}
            >
              → Следующий
            </Button>
          )}

          {/* Прогресс голосования + ручной ввод оценок */}
          {(phase === 'TEXT_VOTING' || phase === 'DELIVERY_VOTING') && currentPerf && (
            <Box p={3} borderRadius="md" bg="yellow.subtle">
              <Flex justify="space-between" align="center" mb={2}>
                <Text fontWeight="bold">
                  {phase === 'TEXT_VOTING' ? 'Голосование за ТЕКСТ...' : 'Голосование за ПОДАЧУ...'}
                </Text>
                <Button
                  size="xs"
                  variant="outline"
                  colorPalette="orange"
                  loading={loading === 'forceComplete'}
                  onClick={() =>
                    handleAction('forceComplete', () =>
                      forceCompleteVotingAction(matchId, phase === 'TEXT_VOTING' ? 'TEXT' : 'DELIVERY')
                    )
                  }
                >
                  Завершить с неполным жюри
                </Button>
              </Flex>
              <ScorerVoteInput
                matchId={matchId}
                performanceId={currentPerf.performanceId}
                dimension={phase === 'TEXT_VOTING' ? 'TEXT' : 'DELIVERY'}
                judges={judges}
              />
            </Box>
          )}

          {/* Завершение тайма / матча */}
          <Flex gap={2}>
            <Button
              colorPalette="yellow"
              variant="outline"
              flex={1}
              loading={loading === 'finishHalf'}
              onClick={() => handleAction('finishHalf', () => finishHalfAction(matchId))}
            >
              Завершить тайм
            </Button>
            <Button
              colorPalette="red"
              variant="outline"
              flex={1}
              loading={loading === 'finishMatch'}
              onClick={() => handleAction('finishMatch', () => finishMatchAction(matchId))}
            >
              Завершить матч
            </Button>
          </Flex>

          {/* История выступлений */}
          {performances.length > 0 && (
            <Box>
              <Heading size="sm" mb={2}>
                Результаты
              </Heading>
              <VStack gap={1} align="stretch">
                {performances.map((p) => (
                  <Flex key={p.id} justify="space-between" align="center" p={2} borderRadius="md" bg="bg.panel">
                    <Text fontSize="sm">{p.playerName}</Text>
                    <Flex gap={2} align="center">
                      {p.textAdjusted !== null && <Badge>Т: {p.textAdjusted}</Badge>}
                      {p.deliveryAdjusted !== null && <Badge>П: {p.deliveryAdjusted}</Badge>}
                      {p.totalScore !== null && <Badge colorPalette="blue">Σ {p.totalScore}</Badge>}
                      <ScoreEditorDialog
                        performanceId={p.id}
                        playerName={p.playerName}
                        initialTextScores={p.textScores}
                        initialDeliveryScores={p.deliveryScores}
                        onSaved={() => router.refresh()}
                      />
                      <CardDialog
                        matchId={matchId}
                        performanceId={p.id}
                        playerName={p.playerName}
                        onIssued={() => router.refresh()}
                      />
                    </Flex>
                  </Flex>
                ))}
              </VStack>
            </Box>
          )}
        </VStack>
      )}
    </Box>
  )
}

// === Список игроков команды ===

function TeamPlayerList({
  team,
  matchId: _matchId,
  onSelectPlayer,
  loading,
}: {
  team: { id: string; name: string; players: Array<{ id: string; name: string; status: string }> }
  matchId: string
  onSelectPlayer: (playerId: string, playerName: string) => Promise<void>
  loading: boolean
}) {
  return (
    <VStack align="stretch" gap={1}>
      <Text fontWeight="bold" fontSize="sm">
        {team.name}
      </Text>
      {team.players.map((player) => (
        <Button
          key={player.id}
          size="sm"
          variant="outline"
          loading={loading}
          onClick={() => onSelectPlayer(player.id, player.name)}
        >
          {player.name}
        </Button>
      ))}
    </VStack>
  )
}
