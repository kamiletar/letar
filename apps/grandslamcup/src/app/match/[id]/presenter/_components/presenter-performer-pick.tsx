'use client'

/**
 * Экран PERFORMER_PICK для ведущего.
 *
 * Показывает список поэтов команды, чья очередь выбирать.
 * Ведущий может выбрать поэта вручную (большие кнопки, по одной на строку).
 * Когда поэт выбран — показывает его имя и кнопку «Начать выступление».
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Button, Heading, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { setCurrentPerformerAction, startPerformanceAction } from '../../score/_actions/scorer.action'

interface PlayerData {
  id: string
  name: string
  status: string
}

interface PresenterPerformerPickProps {
  match: {
    id: string
    firstHalfStartTeam: string | null
    homeTeam: { id: string; name: string; players: PlayerData[] }
    awayTeam: { id: string; name: string; players: PlayerData[] }
    performances: Array<{ half: number; teamSeasonId: string; playerName: string }>
  }
  matchState: MatchSSEState | null
}

export function PresenterPerformerPick({ match, matchState }: PresenterPerformerPickProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const half = matchState?.currentHalf ?? 1
  const round = matchState?.currentRound ?? 1
  const performerIndex = matchState?.currentPerformerIndex ?? 0
  const currentPerf = matchState?.currentPerformances[performerIndex]

  // Определяем команду, чья очередь выбирать — та же логика что у скорера
  const firstStartHome = match.firstHalfStartTeam === 'HOME'
  const firstOfPairIsHome = half === 1 ? firstStartHome : !firstStartHome
  const pickingTeamIsHome = performerIndex === 0 ? firstOfPairIsHome : !firstOfPairIsHome
  const pickingTeam = pickingTeamIsHome ? match.homeTeam : match.awayTeam

  // Игроки, уже выступавшие в текущем тайме
  const playedInHalfNames = new Set(
    match.performances.filter((p) => p.half === half && p.teamSeasonId === pickingTeam.id).map((p) => p.playerName)
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
    [match.id, pickingTeam.id, pickingTeam.name, router]
  )

  const handleStart = useCallback(async () => {
    setPending(true)
    setError(null)
    const res = await startPerformanceAction(match.id)
    setPending(false)
    if (!res.success) {
      setError('Не удалось начать выступление')
      return
    }
    router.refresh()
  }, [match.id, router])

  return (
    <VStack gap={5} align="stretch" py={4}>
      <Box textAlign="center">
        <Heading size="2xl" mb={2}>
          Тайм {half} · Пара {round}
        </Heading>
        <Text color="fg.muted">{performerIndex === 0 ? 'Первый поэт пары' : 'Второй поэт пары'}</Text>
      </Box>

      {currentPerf ? (
        // Поэт выбран — показываем имя и кнопку старта
        <VStack gap={4} align="stretch">
          <Box bg="blue.subtle" p={6} borderRadius="xl" borderWidth="2px" borderColor="blue.solid" textAlign="center">
            <Badge colorPalette={pickingTeamIsHome ? 'blue' : 'orange'} size="lg" mb={3}>
              {currentPerf.teamName}
            </Badge>
            <Heading size="4xl" mb={2}>
              🎤 {currentPerf.playerName}
            </Heading>
            <Text color="fg.muted">Готов к выступлению</Text>
          </Box>

          {error && (
            <Text color="red.fg" fontSize="sm" textAlign="center">
              {error}
            </Text>
          )}

          <Button size="2xl" colorPalette="blue" onClick={handleStart} loading={pending} py={8} fontSize="xl">
            ▶ Начать выступление
          </Button>
        </VStack>
      ) : (
        // Выбор поэта — большие кнопки по одной на строку
        <VStack gap={3} align="stretch">
          <Box textAlign="center" bg="yellow.subtle" p={4} borderRadius="xl" borderWidth="2px" borderColor="yellow.solid">
            <Heading size="lg" mb={1}>
              {pickingTeam.name}
            </Heading>
            <Text fontSize="sm" color="fg.muted">
              Выберите поэта
            </Text>
          </Box>

          {pickingTeam.players.map((player) => {
            const alreadyPlayed = playedInHalfNames.has(player.name)
            return (
              <Button
                key={player.id}
                size="2xl"
                variant={alreadyPlayed ? 'ghost' : 'outline'}
                disabled={alreadyPlayed || pending}
                onClick={() => handlePick(player.id, player.name)}
                w="full"
                py={7}
                fontSize="xl"
                whiteSpace="normal"
                h="auto"
              >
                <VStack gap={1}>
                  <Text>{player.name}</Text>
                  {alreadyPlayed && (
                    <Badge size="sm" colorPalette="gray">
                      уже выступал
                    </Badge>
                  )}
                </VStack>
              </Button>
            )
          })}

          {error && (
            <Text color="red.fg" fontSize="sm" textAlign="center">
              {error}
            </Text>
          )}
        </VStack>
      )}
    </VStack>
  )
}
