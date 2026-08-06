'use client'

/**
 * Основной клиентский компонент экрана тренера на матче
 *
 * Mobile-first. SSE подписка для обновлений в реальном времени.
 * Тренер может выпускать своих игроков на сцену.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { useMatchSSE } from '@/app/_hooks/use-match-sse'
import { Box, Button, Container, Heading, Separator, Text, VStack } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { LuPause } from 'react-icons/lu'

import type { LineupStatus } from '@/generated/prisma'

import { requestTimeoutAction, sendPlayerAction } from '../_actions/coach-match.action'
import { JudgeRecusal } from './judge-recusal'
import { MatchScoreReadonly } from './match-score-readonly'
import { type PlayerLineupItem, PlayerList } from './player-list'
import { type PerformanceResult, RoundResults } from './round-results'

export interface CoachMatchData {
  id: string
  status: string
  homeScore: number | null
  awayScore: number | null
  coachToken: string
  coachSide: 'home' | 'away'
  coachTeamSeasonId: string
  homeTeam: {
    id: string
    name: string
    players: Array<{ id: string; name: string; status: LineupStatus }>
  }
  awayTeam: {
    id: string
    name: string
    players: Array<{ id: string; name: string; status: LineupStatus }>
  }
  venue: string | null
  season: string
  tour: string
  performances: PerformanceResult[]
}

interface CoachMatchClientProps {
  match: CoachMatchData
}

export function CoachMatchClient({ match }: CoachMatchClientProps) {
  const [performances, setPerformances] = useState(match.performances)
  const [homeScore, setHomeScore] = useState(match.homeScore)
  const [awayScore, setAwayScore] = useState(match.awayScore)
  const [matchStatus, setMatchStatus] = useState(match.status)

  const myTeam = match.coachSide === 'home' ? match.homeTeam : match.awayTeam
  const teamName = myTeam.name

  // SSE подключение
  const { matchState, status: sseStatus } = useMatchSSE({
    matchId: match.id,
    role: 'coach',
    token: match.coachToken,
    enabled: true,
    onEvent: useCallback((event) => {
      // Обновляем счёт из score:calculated
      if (event.type === 'score:calculated') {
        const payload = event.payload as {
          homeScore: number
          awayScore: number
        }
        setHomeScore(payload.homeScore)
        setAwayScore(payload.awayScore)
      }
      // Обновляем статус матча
      if (event.type === 'match:started') {
        setMatchStatus('LIVE')
      }
      if (event.type === 'match:finished') {
        setMatchStatus('FINISHED')
      }
    }, []),
  })

  const currentHalf = matchState?.currentHalf ?? 1
  const currentRound = matchState?.currentRound ?? 1

  // Формируем список игроков с расширенными статусами
  const playerItems: PlayerLineupItem[] = useMemo(() => {
    return myTeam.players.map((p) => {
      // Проверяем в каких таймах игрок выступал
      const playedHalf1 = performances.some(
        (perf) => perf.teamSeasonId === match.coachTeamSeasonId && perf.half === 1 && perf.playerName === p.name,
      )
      const playedHalf2 = performances.some(
        (perf) => perf.teamSeasonId === match.coachTeamSeasonId && perf.half === 2 && perf.playerName === p.name,
      )
      return {
        id: p.id,
        name: p.name,
        status: p.status,
        playedHalf1,
        playedHalf2,
      }
    })
  }, [myTeam.players, performances, match.coachTeamSeasonId])

  // Считаем использованные замены во 2-м тайме
  const substitutionsUsed = useMemo(() => {
    if (currentHalf < 2) {
      return 0
    }
    // Замена — это когда запасной (SUBSTITUTE/REPLACEMENT) выступил во 2-м тайме
    return performances.filter(
      (perf) =>
        perf.teamSeasonId === match.coachTeamSeasonId
        && perf.half === 2
        && myTeam.players.some((p) => p.name === perf.playerName && p.status === 'SUBSTITUTE'),
    ).length
  }, [performances, currentHalf, match.coachTeamSeasonId, myTeam.players])

  // Можно ли сейчас выпустить игрока
  const canSendPlayer = matchStatus === 'LIVE'
    && (matchState?.phase === 'IDLE' || matchState?.phase === 'ROUND_COMPLETE')

  const handleSendPlayer = async (playerId: string, playerName: string) => {
    const result = await sendPlayerAction(match.id, match.coachToken, playerId, playerName, teamName)
    if (!result.success) {
      toaster.error({ title: result.error ?? 'Ошибка' })
      return
    }
    // Добавляем перформанс в локальное состояние
    setPerformances((prev) => [
      ...prev,
      {
        id: result.performanceId!,
        half: currentHalf,
        roundNumber: currentRound,
        playerName,
        teamSeasonId: match.coachTeamSeasonId,
        totalScore: null,
        textAdjusted: null,
        deliveryAdjusted: null,
      },
    ])
    toaster.success({ title: `${playerName} выходит!` })
  }

  return (
    <Container maxW="md" py={4}>
      <VStack gap={4} align="stretch">
        {/* Заголовок */}
        <Box textAlign="center">
          <Heading size="lg">Тренер: {teamName}</Heading>
          <Text fontSize="sm" color="fg.muted">
            {match.season} · {match.tour}
            {match.venue && ` · ${match.venue}`}
          </Text>
          {sseStatus === 'connected' && (
            <Text fontSize="xs" color="green.500">
              Подключено
            </Text>
          )}
          {sseStatus === 'connecting' && (
            <Text fontSize="xs" color="yellow.500">
              Подключение...
            </Text>
          )}
          {sseStatus === 'error' && (
            <Text fontSize="xs" color="red.500">
              Ошибка подключения
            </Text>
          )}
        </Box>

        {/* Счёт */}
        <MatchScoreReadonly
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
          homeScore={homeScore}
          awayScore={awayScore}
          status={matchStatus}
          coachSide={match.coachSide}
          currentHalf={currentHalf}
          currentRound={currentRound}
        />

        {/* Отвод судьи (если разрешён ведущим) */}
        {matchStatus === 'LIVE' && matchState && (
          <JudgeRecusal
            matchId={match.id}
            coachToken={match.coachToken}
            judges={matchState.judges ?? []}
            allowed={matchState.judgeRecusalAllowed ?? false}
          />
        )}

        <Separator />

        {/* Мои игроки */}
        <Box>
          <Heading size="md" mb={3}>
            Мои игроки
          </Heading>
          <PlayerList
            players={playerItems}
            currentHalf={currentHalf}
            canSendPlayer={canSendPlayer}
            substitutionsUsed={substitutionsUsed}
            maxSubstitutions={2}
            onSendPlayer={handleSendPlayer}
          />
        </Box>

        <Separator />

        {/* Запросить паузу */}
        {matchStatus === 'LIVE' && (
          <Button
            variant="outline"
            colorPalette="yellow"
            size="sm"
            onClick={async () => {
              const result = await requestTimeoutAction(match.id, match.coachToken, 'Запрос паузы от тренера')
              if ('error' in result) {
                toaster.error({ title: String(result.error) })
              } else {
                toaster.success({ title: 'Запрос паузы отправлен скореру' })
              }
            }}
          >
            <LuPause size={14} />
            Запросить паузу
          </Button>
        )}

        <Separator />

        {/* Результаты раундов */}
        <Box>
          <Heading size="md" mb={3}>
            Результаты
          </Heading>
          <RoundResults performances={performances} coachTeamSeasonId={match.coachTeamSeasonId} />
        </Box>
      </VStack>
    </Container>
  )
}
