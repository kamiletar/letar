'use client'

/**
 * Основной клиентский компонент экрана скорера
 *
 * Содержит: QR для жюри, мониторинг судей, текущий счёт, управление раундами.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { useMatchSSE } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuUsers } from 'react-icons/lu'

import { PerformanceTimer } from '@/app/match/[id]/presenter/_components/performance-timer'

import { JuryPanel } from './jury-panel'
import { OfflineStatusBar } from './offline-status-bar'
import { Scoreboard } from './scoreboard'
import { ScorerLineupDialog } from './scorer-lineup-dialog'
import { VotePanel } from './vote-panel'

export interface MatchData {
  id: string
  status: string
  homeScore: number
  awayScore: number
  firstHalfStartTeam: string | null
  /** Поэт, читавший победное стихотворение (заполняется на последнем шаге wizard) */
  victoryPoemPlayerId?: string | null
  /** Отображаемое имя поэта победного стиха (для финального экрана) */
  victoryPoemPlayerName?: string | null
  scorerToken: string
  homeTeam: {
    id: string
    name: string
    players: Array<{ id: string; name: string; status: string }>
    hasLineup: boolean
    roster: Array<{ id: string; name: string; role: string }>
  }
  awayTeam: {
    id: string
    name: string
    players: Array<{ id: string; name: string; status: string }>
    hasLineup: boolean
    roster: Array<{ id: string; name: string; role: string }>
  }
  venue: string | null
  season: string
  tour: string
  /** Город команды использует терминологию «дома/в гостях» */
  useHomeAway?: boolean
  /** Slug города для формирования URL публичной страницы */
  citySlug?: string | null
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
    votes: Array<{
      judgeName: string
      judgeNumber: number
      dimension: string
      score: number
    }>
  }>
}

interface ScorerClientProps {
  match: MatchData
}

export function ScorerClient({ match }: ScorerClientProps) {
  // Какой командой сейчас управляет диалог заявки составов (null — закрыт)
  const [lineupDialogTeam, setLineupDialogTeam] = useState<'home' | 'away' | null>(null)

  const { status, matchState } = useMatchSSE({
    matchId: match.id,
    role: 'scorer',
    token: match.scorerToken,
    onEvent: useCallback((event: { type: string; payload: unknown }) => {
      if (event.type === 'coach:signal') {
        const payload = event.payload as { teamName: string; reason: string }
        toaster.info({
          title: `⏸ ${payload.teamName}: ${payload.reason}`,
          duration: 10000,
        })
      }
    }, []),
  })

  const connectionColor = status === 'connected' ? 'green' : status === 'connecting' ? 'yellow' : 'red'

  return (
    <Box p={4} maxW="1200px" mx="auto">
      {/* Заголовок */}
      <Flex justify="space-between" align="center" mb={4}>
        <VStack align="start" gap={0}>
          <Heading size="lg">Скорер</Heading>
          <Text fontSize="sm" color="fg.muted">
            {match.season} — {match.tour}
          </Text>
          {match.venue && (
            <Text fontSize="sm" color="fg.muted">
              {match.venue}
            </Text>
          )}
        </VStack>
        <Flex align="center" gap={2}>
          <Box w={3} h={3} borderRadius="full" bg={`${connectionColor}.500`} />
          <Text fontSize="sm" color="fg.muted">
            {status === 'connected' ? 'Подключено' : status === 'connecting' ? 'Подключение...' : 'Отключено'}
          </Text>
        </Flex>
      </Flex>

      {/* Оффлайн-статус */}
      <Box mb={4}>
        <OfflineStatusBar matchId={match.id} scorerToken={match.scorerToken} matchData={match} />
      </Box>

      {/* Табло */}
      <Scoreboard
        homeTeamName={match.homeTeam.name}
        awayTeamName={match.awayTeam.name}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        matchStatus={match.status}
        phase={matchState?.phase ?? 'IDLE'}
        currentHalf={matchState?.currentHalf ?? 1}
        currentRound={matchState?.currentRound ?? 1}
      />

      {/* Таймер (read-only, управляется ведущим) */}
      {match.status === 'LIVE' && matchState?.timer && (
        <Box my={4} maxW="400px">
          <PerformanceTimer matchId={match.id} timer={matchState.timer} />
        </Box>
      )}

      {/* Составы команд — счетовод может заявить за команду если тренер не пришёл */}
      <Box my={4}>
        <Heading size="sm" mb={2}>
          Составы команд
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          <LineupCard
            teamName={match.homeTeam.name}
            hasLineup={match.homeTeam.hasLineup}
            lineupCount={match.homeTeam.players.length}
            onEdit={() => setLineupDialogTeam('home')}
          />
          <LineupCard
            teamName={match.awayTeam.name}
            hasLineup={match.awayTeam.hasLineup}
            lineupCount={match.awayTeam.players.length}
            onEdit={() => setLineupDialogTeam('away')}
          />
        </SimpleGrid>
        {(!match.homeTeam.hasLineup || !match.awayTeam.hasLineup) && match.status === 'SCHEDULED' && (
          <Text fontSize="xs" color="orange.fg" mt={2}>
            ⚠ Невозможно начать матч без составов обеих команд.
          </Text>
        )}
      </Box>

      {/* Панель жюри */}
      <JuryPanel
        matchId={match.id}
        judges={matchState?.judges ?? []}
        currentHalf={matchState?.currentHalf ?? 1}
        phase={matchState?.phase}
        votingOpenedAt={matchState?.votingOpenedAt}
      />

      {/* Панель голосования */}
      <VotePanel
        matchId={match.id}
        matchStatus={match.status}
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        phase={matchState?.phase ?? 'IDLE'}
        currentPerformances={matchState?.currentPerformances ?? []}
        currentPerformerIndex={matchState?.currentPerformerIndex ?? 0}
        judges={matchState?.judges ?? []}
        performances={match.performances}
      />

      {/* Диалог заявки составов */}
      {lineupDialogTeam && (
        <ScorerLineupDialog
          open={lineupDialogTeam !== null}
          onClose={() => setLineupDialogTeam(null)}
          matchId={match.id}
          scorerToken={match.scorerToken}
          teamSeasonId={lineupDialogTeam === 'home' ? match.homeTeam.id : match.awayTeam.id}
          teamName={lineupDialogTeam === 'home' ? match.homeTeam.name : match.awayTeam.name}
          roster={lineupDialogTeam === 'home' ? match.homeTeam.roster : match.awayTeam.roster}
          currentLineup={lineupDialogTeam === 'home'
            ? match.homeTeam.players.map((p) => p.id)
            : match.awayTeam.players.map((p) => p.id)}
        />
      )}
    </Box>
  )
}

/** Карточка одной команды — показывает статус заявки и кнопку редактирования */
function LineupCard({
  teamName,
  hasLineup,
  lineupCount,
  onEdit,
}: {
  teamName: string
  hasLineup: boolean
  lineupCount: number
  onEdit: () => void
}) {
  return (
    <Box
      p={3}
      borderRadius="md"
      borderWidth="1px"
      borderColor={hasLineup ? 'green.muted' : 'orange.muted'}
      bg={hasLineup ? 'green.subtle' : 'orange.subtle'}
    >
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontSize="sm" fontWeight="bold" lineClamp={1}>
          {teamName}
        </Text>
        <Badge colorPalette={hasLineup ? 'green' : 'orange'} size="sm">
          {hasLineup ? `${lineupCount} чел.` : 'нет состава'}
        </Badge>
      </Flex>
      <Button size="xs" variant="outline" w="full" onClick={onEdit}>
        <LuUsers size={14} /> {hasLineup ? 'Изменить состав' : 'Заявить состав'}
      </Button>
    </Box>
  )
}
