'use client'

/**
 * Главный контейнер wizard'а счетовода.
 *
 * Использует SSE для синхронизации matchState, вычисляет текущий шаг через
 * `computeWizardStep` и рендерит соответствующий компонент-шаг. Любое SSE
 * обновление автоматически переключает wizard на нужный шаг — никакой локальной
 * state machine, всё выводится из реального состояния матча.
 */

import { useMatchSSE } from '@/app/_hooks/use-match-sse'
import { Box, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { computeWizardStep } from './compute-wizard-step'
import { StepCoinFlip } from './step-coin-flip'
import { StepFinalResults } from './step-final-results'
import { StepHalfSummary } from './step-half-summary'
import { StepIntermission } from './step-intermission'
import { StepMatchFinished } from './step-match-finished'
import { StepPairResults } from './step-pair-results'
import { StepPerformerPick } from './step-performer-pick'
import { StepPerforming } from './step-performing'
import { StepPoetResult } from './step-poet-result'
import { StepSelectJury } from './step-select-jury'
import { StepStartMatch } from './step-start-match'
import { StepVictoryPoem } from './step-victory-poem'
import { StepVoting } from './step-voting'
import { WizardHeader } from './wizard-header'

import type { MatchData } from '../scorer-client'

interface ScorerWizardProps {
  match: MatchData & {
    firstHalfStartTeam: string | null
    victoryPoemPlayerId: string | null
    victoryPoemPlayerName: string | null
  }
}

export function ScorerWizard({ match }: ScorerWizardProps) {
  const router = useRouter()
  const routerRef = useRef(router)
  routerRef.current = router

  const { status: connectionStatus, matchState } = useMatchSSE({
    matchId: match.id,
    role: 'scorer',
    token: match.scorerToken,
    onEvent: (event) => {
      // Обновляем серверные данные при событиях, меняющих поля матча в БД:
      // жеребьёвка, старт матча, победное стихотворение, составы
      const refreshEvents = ['coin:flipped', 'match:started', 'victory-poem:set', 'lineup:updated', 'match:finished']
      if (refreshEvents.includes(event.type)) {
        routerRef.current.refresh()
      }
    },
  })

  // Локальный флаг: скорер прочитал финальные результаты и нажал «Перейти к выбору поэта»
  const [finalResultsConfirmed, setFinalResultsConfirmed] = useState(false)

  const step = computeWizardStep(
    {
      status: match.status,
      firstHalfStartTeam: match.firstHalfStartTeam,
      victoryPoemPlayerId: match.victoryPoemPlayerId,
      finalResultsConfirmed,
      performances: match.performances.map((p) => ({ half: p.half, totalScore: p.totalScore })),
    },
    matchState,
  )

  const currentHalf = matchState?.currentHalf ?? 1
  const currentRound = matchState?.currentRound ?? 1

  return (
    <Box minH="100dvh" bg="bg">
      <WizardHeader
        matchId={match.id}
        scorerToken={match.scorerToken}
        season={match.season}
        tour={match.tour}
        venue={match.venue}
        homeTeamName={match.homeTeam.name}
        awayTeamName={match.awayTeam.name}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        currentHalf={currentHalf}
        currentRound={currentRound}
        step={step}
        connectionStatus={connectionStatus}
      />

      <VStack gap={4} p={4} maxW="1000px" mx="auto" align="stretch">
        {step === 'START_MATCH' && <StepStartMatch match={match} />}
        {step === 'SELECT_JURY' && <StepSelectJury match={match} matchState={matchState} />}
        {step === 'COIN_FLIP' && <StepCoinFlip match={match} />}
        {step === 'PERFORMER_PICK' && <StepPerformerPick match={match} matchState={matchState} />}
        {step === 'PERFORMING' && <StepPerforming match={match} matchState={matchState} />}
        {step === 'TEXT_VOTING' && <StepVoting dimension="TEXT" match={match} matchState={matchState} />}
        {step === 'DELIVERY_VOTING' && <StepVoting dimension="DELIVERY" match={match} matchState={matchState} />}
        {step === 'POET_RESULT' && <StepPoetResult match={match} matchState={matchState} />}
        {step === 'PAIR_RESULTS' && <StepPairResults match={match} matchState={matchState} />}
        {step === 'HALF_SUMMARY' && <StepHalfSummary match={match} matchState={matchState} />}
        {step === 'INTERMISSION' && <StepIntermission match={match} />}
        {step === 'FINAL_RESULTS' && (
          <StepFinalResults
            match={match}
            onConfirm={() => setFinalResultsConfirmed(true)}
          />
        )}
        {step === 'VICTORY_POEM' && <StepVictoryPoem match={match} />}
        {step === 'MATCH_FINISHED' && <StepMatchFinished match={match} />}
      </VStack>
    </Box>
  )
}
