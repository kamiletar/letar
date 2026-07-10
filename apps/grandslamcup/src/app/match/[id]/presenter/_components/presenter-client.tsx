'use client'

/**
 * Главный клиентский компонент экрана ведущего — wizard-стиль.
 *
 * Wizard синхронизирован с экраном скорера через SSE. Ведущий видит
 * только то что актуально в данный момент. Управляет таймером выступления.
 * Поддерживает автоматический fullscreen.
 */

import { useMatchSSE } from '@/app/_hooks/use-match-sse'
import { Box } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { computeWizardStep } from '../../score/_components/wizard/compute-wizard-step'
import { StepCoinFlip } from '../../score/_components/wizard/step-coin-flip'
import { PresenterHalfSummary } from './presenter-half-summary'
import { PresenterHeader } from './presenter-header'
import { PresenterIntermission } from './presenter-intermission'
import { PresenterPairResults } from './presenter-pair-results'
import { PresenterPerformerPick } from './presenter-performer-pick'
import { PresenterPerforming } from './presenter-performing'
import { PresenterPoetResult } from './presenter-poet-result'
import { PresenterSelectJury } from './presenter-select-jury'
import { PresenterStartMatch } from './presenter-start-match'
import { PresenterVoting } from './presenter-voting'

/**
 * Безопасный вызов requestFullscreen с поддержкой webkit-префикса.
 * iOS Safari не поддерживает стандартный API — игнорируем тихо.
 */
function requestFullscreenSafe(el: HTMLElement) {
  type FullscreenEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
  const elem = el as FullscreenEl
  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch(() => {})
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen().catch?.(() => {})
  }
  // iOS Safari не поддерживает fullscreen API — пропускаем молча
}

/** Тип данных матча для экрана ведущего */
export interface PresenterMatchData {
  id: string
  status: string
  homeScore: number
  awayScore: number
  presenterToken: string
  firstHalfStartTeam: string | null
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
  venue: string | null
  season: string
  tour: string
  citySlug: string | null
  victoryPoemPlayerId: string | null
  victoryPoemPlayerName: string | null
  performances: Array<{
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
    durationSec: number | null
    votes: Array<{
      judgeName: string
      judgeNumber: number
      dimension: string
      score: number
    }>
  }>
}

interface PresenterClientProps {
  match: PresenterMatchData
}

export function PresenterClient({ match }: PresenterClientProps) {
  const router = useRouter()
  // Ref объявляем ДО useMatchSSE, чтобы onEvent мог его использовать
  const routerRef = useRef(router)
  routerRef.current = router

  const [isFullscreen, setIsFullscreen] = useState(false)

  const { status, matchState } = useMatchSSE({
    matchId: match.id,
    role: 'presenter',
    token: match.presenterToken,
    onEvent: (event) => {
      // Обновляем серверные данные при событиях, меняющих поля матча в БД
      const refreshEvents = ['coin:flipped', 'match:started', 'victory-poem:set', 'lineup:updated', 'match:finished']
      if (refreshEvents.includes(event.type)) {
        routerRef.current.refresh()
      }
    },
  })

  // Автоматический fullscreen при монтировании (iOS Safari не поддерживает — безопасный вызов)
  useEffect(() => {
    requestFullscreenSafe(document.documentElement)

    const onFsChange = () => {
      const el =
        document.fullscreenElement ??
        (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
      setIsFullscreen(!!el)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    document.addEventListener('webkitfullscreenchange', onFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange)
      document.removeEventListener('webkitfullscreenchange', onFsChange)
    }
  }, [])

  const step = computeWizardStep(
    {
      status: match.status,
      firstHalfStartTeam: match.firstHalfStartTeam,
      victoryPoemPlayerId: match.victoryPoemPlayerId,
      performances: match.performances.map((p) => ({ half: p.half, totalScore: p.totalScore })),
    },
    matchState
  )

  const handleFullscreen = () => {
    requestFullscreenSafe(document.documentElement)
  }

  return (
    <Box minH="100dvh" bg="bg.canvas" display="flex" flexDir="column">
      {/* Мини-шапка */}
      <PresenterHeader
        homeTeamName={match.homeTeam.name}
        awayTeamName={match.awayTeam.name}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        step={step}
        connectionStatus={status}
        isFullscreen={isFullscreen}
        onFullscreen={handleFullscreen}
      />

      {/* Основной контент — только актуальный шаг */}
      <Box flex={1} p={4} maxW="600px" mx="auto" w="full">
        {step === 'START_MATCH' && <PresenterStartMatch match={match} matchState={matchState} />}
        {step === 'SELECT_JURY' && <PresenterSelectJury match={match} matchState={matchState} />}
        {step === 'COIN_FLIP' && (
          <StepCoinFlip
            match={{
              id: match.id,
              homeTeam: {
                id: match.homeTeam.id,
                name: match.homeTeam.name,
                players: match.homeTeam.players,
                hasLineup: match.homeTeam.players.length > 0,
                roster: [],
              },
              awayTeam: {
                id: match.awayTeam.id,
                name: match.awayTeam.name,
                players: match.awayTeam.players,
                hasLineup: match.awayTeam.players.length > 0,
                roster: [],
              },
              status: match.status,
              homeScore: match.homeScore,
              awayScore: match.awayScore,
              firstHalfStartTeam: match.firstHalfStartTeam,
              scorerToken: match.presenterToken,
              venue: match.venue,
              season: match.season,
              tour: match.tour,
              useHomeAway: false,
              citySlug: match.citySlug,
              victoryPoemPlayerId: match.victoryPoemPlayerId,
              victoryPoemPlayerName: match.victoryPoemPlayerName,
              performances: match.performances,
            }}
          />
        )}
        {step === 'PERFORMER_PICK' && <PresenterPerformerPick match={match} matchState={matchState} />}
        {step === 'PERFORMING' && <PresenterPerforming match={match} matchState={matchState} />}
        {(step === 'TEXT_VOTING' || step === 'DELIVERY_VOTING') && (
          <PresenterVoting matchState={matchState} step={step} />
        )}
        {step === 'POET_RESULT' && (
          <PresenterPoetResult
            match={{
              id: match.id,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              performances: match.performances,
            }}
            matchState={matchState}
          />
        )}
        {step === 'PAIR_RESULTS' && (
          <PresenterPairResults
            match={{
              id: match.id,
              homeTeam: match.homeTeam,
              awayTeam: match.awayTeam,
              performances: match.performances,
            }}
            matchState={matchState}
          />
        )}
        {step === 'HALF_SUMMARY' && <PresenterHalfSummary match={match} matchState={matchState} />}
        {step === 'INTERMISSION' && <PresenterIntermission />}
        {step === 'FINAL_RESULTS' && <PresenterFinalResults match={match} />}
        {step === 'VICTORY_POEM' && <PresenterVictoryPoem match={match} />}
        {step === 'MATCH_FINISHED' && <PresenterMatchFinished match={match} />}
      </Box>
    </Box>
  )
}

// === Inline компоненты для финальных экранов (read-only) ===

function PresenterFinalResults({ match }: { match: PresenterMatchData }) {
  const allPerfs = match.performances.filter((p) => p.totalScore !== null)
  const homeTotal = allPerfs
    .filter((p) => p.teamSeasonId === match.homeTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const awayTotal = allPerfs
    .filter((p) => p.teamSeasonId === match.awayTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const isDraw = homeTotal === awayTotal
  const winnerName = isDraw ? null : homeTotal > awayTotal ? match.homeTeam.name : match.awayTeam.name

  return (
    <Box py={8} textAlign="center">
      <Box mb={6}>
        <Box fontSize="4xl" mb={2}>
          {isDraw ? '🤝' : '🏆'}
        </Box>
        <Box fontSize="2xl" fontWeight="bold" mb={1}>
          {isDraw ? 'Ничья' : `Победитель: ${winnerName}`}
        </Box>
      </Box>
      <Box bg="blue.subtle" p={8} borderRadius="2xl" borderWidth="2px" borderColor="blue.solid">
        <Box fontSize="sm" color="fg.muted" mb={2}>
          {match.homeTeam.name} vs {match.awayTeam.name}
        </Box>
        <Box fontSize="6xl" fontWeight="bold" fontFamily="mono">
          {homeTotal} : {awayTotal}
        </Box>
      </Box>
    </Box>
  )
}

function PresenterVictoryPoem({ match }: { match: PresenterMatchData }) {
  const allPerfs = match.performances.filter((p) => p.totalScore !== null)
  const homeTotal = allPerfs
    .filter((p) => p.teamSeasonId === match.homeTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const awayTotal = allPerfs
    .filter((p) => p.teamSeasonId === match.awayTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)

  return (
    <Box py={8} textAlign="center">
      <Box fontSize="4xl" mb={4}>
        🏆
      </Box>
      <Box fontSize="2xl" fontWeight="bold" mb={2}>
        Выбор победного стихотворения
      </Box>
      <Box bg="blue.subtle" p={6} borderRadius="xl" borderWidth="2px" borderColor="blue.solid" mb={4}>
        <Box fontSize="5xl" fontWeight="bold" fontFamily="mono">
          {homeTotal} : {awayTotal}
        </Box>
      </Box>
      <Box color="fg.muted">Победитель выбирает стихотворение на своём экране</Box>
    </Box>
  )
}

function PresenterMatchFinished({ match }: { match: PresenterMatchData }) {
  const allPerfs = match.performances.filter((p) => p.totalScore !== null)
  const homeTotal = allPerfs
    .filter((p) => p.teamSeasonId === match.homeTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const awayTotal = allPerfs
    .filter((p) => p.teamSeasonId === match.awayTeam.id)
    .reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const winnerName = homeTotal > awayTotal ? match.homeTeam.name : awayTotal > homeTotal ? match.awayTeam.name : 'Ничья'

  return (
    <Box py={12} textAlign="center">
      <Box fontSize="4xl" mb={4}>
        🏁
      </Box>
      <Box fontSize="3xl" fontWeight="bold" mb={4}>
        Матч завершён
      </Box>
      <Box bg="blue.subtle" p={8} borderRadius="2xl" borderWidth="2px" borderColor="blue.solid" mb={4}>
        <Box fontSize="sm" color="fg.muted" mb={2}>
          {match.homeTeam.name} vs {match.awayTeam.name}
        </Box>
        <Box fontSize="5xl" fontWeight="bold" fontFamily="mono">
          {homeTotal} : {awayTotal}
        </Box>
        <Box mt={3} fontWeight="bold" color="green.fg" fontSize="xl">
          🏆 {winnerName}
        </Box>
      </Box>
      {match.victoryPoemPlayerName && <Box color="fg.muted">Победное стихотворение: {match.victoryPoemPlayerName}</Box>}
    </Box>
  )
}
