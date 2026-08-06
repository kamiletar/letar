'use client'

/**
 * Шаг 1: Старт матча.
 *
 * Показывает составы обеих команд с кнопкой заявки (если не заявлены)
 * и большую кнопку «Начать матч». Кнопка активна только когда обе команды
 * имеют состав из 5+ игроков.
 */

import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { LuPlay, LuUsers } from 'react-icons/lu'
import { startMatchAction } from '../../_actions/scorer.action'
import type { MatchData } from '../scorer-client'
import { ScorerLineupDialog } from '../scorer-lineup-dialog'

interface StepStartMatchProps {
  match: MatchData
}

export function StepStartMatch({ match }: StepStartMatchProps) {
  const router = useRouter()
  const [lineupDialogTeam, setLineupDialogTeam] = useState<'home' | 'away' | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canStart = match.homeTeam.hasLineup && match.awayTeam.hasLineup

  const handleStart = useCallback(async () => {
    setStarting(true)
    setError(null)
    const res = await startMatchAction(match.id)
    setStarting(false)
    if (!res.success) {
      setError(res.error ?? 'Не удалось начать матч')
      return
    }
    router.refresh()
  }, [match.id, router])

  return (
    <VStack gap={6} align="stretch" py={8}>
      <Box textAlign="center">
        <Heading size="xl" mb={2}>
          🏁 Готовы начать матч?
        </Heading>
        <Text color="fg.muted">Убедитесь что обе команды заявили состав перед стартом.</Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
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

      {error && (
        <Text color="red.fg" textAlign="center" fontSize="sm">
          {error}
        </Text>
      )}

      <Button
        size="2xl"
        colorPalette="green"
        disabled={!canStart}
        loading={starting}
        onClick={handleStart}
        py={10}
        fontSize="2xl"
        fontWeight="bold"
      >
        <LuPlay /> Начать матч
      </Button>

      {!canStart && (
        <Text color="orange.fg" textAlign="center" fontSize="sm">
          ⚠ Невозможно начать матч без составов обеих команд.
        </Text>
      )}

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
    </VStack>
  )
}

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
      p={4}
      borderRadius="xl"
      borderWidth="2px"
      borderColor={hasLineup ? 'green.solid' : 'orange.solid'}
      bg={hasLineup ? 'green.subtle' : 'orange.subtle'}
    >
      <Flex justify="space-between" align="center" mb={3}>
        <Heading size="md" lineClamp={1}>
          {teamName}
        </Heading>
        <Badge colorPalette={hasLineup ? 'green' : 'orange'} size="md">
          {hasLineup ? `${lineupCount} чел.` : 'нет состава'}
        </Badge>
      </Flex>
      <Button size="sm" variant="outline" w="full" onClick={onEdit}>
        <LuUsers size={14} /> {hasLineup ? 'Изменить состав' : 'Заявить состав'}
      </Button>
    </Box>
  )
}
