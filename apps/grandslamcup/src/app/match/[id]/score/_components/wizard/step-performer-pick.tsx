'use client'

/**
 * Шаг 4: Выбор выступающего поэта.
 *
 * Определяем кто должен выбирать (тренер команды A или B) по текущему состоянию
 * пары и результату жеребьёвки. Показываем waiting screen, а ниже — fallback
 * список игроков команды для ручного выбора счетоводом.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Button, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { LuUser } from 'react-icons/lu'
import { setCurrentPerformerAction, startPerformanceAction } from '../../_actions/scorer.action'
import type { MatchData } from '../scorer-client'

interface StepPerformerPickProps {
  match: MatchData & { firstHalfStartTeam: string | null }
  matchState: MatchSSEState | null
}

export function StepPerformerPick({ match, matchState }: StepPerformerPickProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const half = matchState?.currentHalf ?? 1
  const round = matchState?.currentRound ?? 1
  const performerIndex = matchState?.currentPerformerIndex ?? 0
  const currentPair = matchState?.currentPerformances ?? []
  const currentPerf = currentPair[performerIndex]

  // Кто должен выступать: если первый в паре — команда-по-жеребьёвке (с инверсией во 2 тайме),
  // если второй — противоположная
  const firstStartHome = match.firstHalfStartTeam === 'HOME'
  const firstOfPairIsHome = half === 1 ? firstStartHome : !firstStartHome
  const pickingTeamIsHome = performerIndex === 0 ? firstOfPairIsHome : !firstOfPairIsHome
  const pickingTeam = pickingTeamIsHome ? match.homeTeam : match.awayTeam

  // Игроки которые уже выступали в текущем тайме (нельзя выбирать повторно в одном тайме)
  const playedInHalfIds = new Set(
    match.performances.filter((p) => p.half === half && p.teamSeasonId === pickingTeam.id).map((p) => p.playerName), // по имени (id в performances нет)
  )

  const handlePick = useCallback(
    async (playerId: string, playerName: string) => {
      setPending(true)
      setError(null)
      const res = await setCurrentPerformerAction(match.id, playerId, playerName, pickingTeam.id, pickingTeam.name)
      setPending(false)
      if (!res.success) {
        setError('Не удалось выбрать поэта')
      }
      router.refresh()
    },
    [match.id, pickingTeam.id, pickingTeam.name, router],
  )

  const handleStartPerformance = useCallback(async () => {
    setPending(true)
    setError(null)
    // Запускаем фазу PERFORMING (таймер + ожидание выступления)
    const res = await startPerformanceAction(match.id)
    setPending(false)
    if (!res.success) {
      setError('Не удалось начать выступление')
      return
    }
    router.refresh()
  }, [match.id, router])

  return (
    <VStack gap={6} align="stretch" py={4}>
      <Box textAlign="center">
        <Heading size="xl" mb={2}>
          Тайм {half}, пара {round} из 5
        </Heading>
        <Text color="fg.muted">{performerIndex === 0 ? 'Первый поэт пары' : 'Второй поэт пары'}</Text>
      </Box>

      {currentPerf
        ? (
          // Поэт уже выбран, ждём старта голосования
          <Box bg="blue.subtle" p={6} borderRadius="xl" borderWidth="2px" borderColor="blue.solid">
            <Text fontSize="sm" color="fg.muted" textAlign="center">
              Готов к выступлению:
            </Text>
            <Heading size="2xl" textAlign="center" my={3}>
              🎤 {currentPerf.playerName}
            </Heading>
            <Text textAlign="center" color="fg.muted" mb={4}>
              {currentPerf.teamName}
            </Text>
            <Button
              size="xl"
              w="full"
              colorPalette="blue"
              onClick={handleStartPerformance}
              loading={pending}
              fontSize="lg"
              py={7}
            >
              ▶ Начать выступление
            </Button>
            {error && (
              <Text color="red.fg" fontSize="sm" textAlign="center" mt={2}>
                {error}
              </Text>
            )}
          </Box>
        )
        : (
          // Ждём выбора от тренера / ручной выбор
          <>
            <Box
              bg="yellow.subtle"
              p={6}
              borderRadius="xl"
              textAlign="center"
              borderWidth="2px"
              borderColor="yellow.solid"
            >
              <Heading size="lg" mb={1}>
                ⏳ Тренер команды {pickingTeam.name} выбирает поэта...
              </Heading>
              <Text fontSize="sm" color="fg.muted">
                Тренер выбирает через свой интерфейс, либо вы можете выбрать вручную ниже.
              </Text>
            </Box>

            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={2}>
                Ручной выбор ({pickingTeam.name}):
              </Text>
              <SimpleGrid columns={{ base: 2, sm: 3 }} gap={2}>
                {pickingTeam.players.map((player) => {
                  const alreadyPlayed = playedInHalfIds.has(player.name)
                  return (
                    <Button
                      key={player.id}
                      size="md"
                      variant={alreadyPlayed ? 'ghost' : 'outline'}
                      disabled={alreadyPlayed || pending}
                      onClick={() => handlePick(player.id, player.name)}
                      h="auto"
                      py={3}
                      whiteSpace="normal"
                    >
                      <VStack gap={0}>
                        <LuUser size={14} />
                        <Text fontSize="sm" lineClamp={2}>
                          {player.name}
                        </Text>
                        {alreadyPlayed && (
                          <Badge size="sm" colorPalette="gray">
                            уже выступал
                          </Badge>
                        )}
                      </VStack>
                    </Button>
                  )
                })}
              </SimpleGrid>
            </Box>

            {error && (
              <Text color="red.fg" fontSize="sm" textAlign="center">
                {error}
              </Text>
            )}
          </>
        )}
    </VStack>
  )
}
