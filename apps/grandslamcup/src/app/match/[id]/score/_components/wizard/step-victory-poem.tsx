'use client'

/**
 * Шаг 11: Выбор поэта для победного стихотворения.
 *
 * Определяем команду-победителя по счёту. Показываем список игроков команды-победителя,
 * счётовод выбирает поэта → setVictoryPoemAction → matchStatus=FINISHED → MATCH_FINISHED.
 */

import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { finishMatchAction, setVictoryPoemAction } from '../../_actions/scorer.action'
import type { MatchData } from '../scorer-client'

interface StepVictoryPoemProps {
  match: MatchData
}

export function StepVictoryPoem({ match }: StepVictoryPoemProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [drawPending, setDrawPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Считаем итоговый счёт из performances (т.к. matchState может быть не актуален)
  const homeTotal = match.performances
    .filter((p) => p.teamSeasonId === match.homeTeam.id && p.totalScore !== null)
    .reduce((sum, p) => sum + (p.totalScore ?? 0), 0)
  const awayTotal = match.performances
    .filter((p) => p.teamSeasonId === match.awayTeam.id && p.totalScore !== null)
    .reduce((sum, p) => sum + (p.totalScore ?? 0), 0)

  const winnerIsHome = homeTotal > awayTotal
  const winnerIsAway = awayTotal > homeTotal
  const isDraw = homeTotal === awayTotal
  const winnerTeam = winnerIsHome ? match.homeTeam : winnerIsAway ? match.awayTeam : null

  const handleConfirm = useCallback(async () => {
    if (!selectedId) { return }
    setPending(true)
    setError(null)
    const res = await setVictoryPoemAction(match.id, selectedId)
    setPending(false)
    if (!res.success) {
      setError(res.error ?? 'Не удалось сохранить')
      return
    }
    router.refresh()
  }, [match.id, selectedId, router])

  const handleFinishDraw = useCallback(async () => {
    setDrawPending(true)
    setError(null)
    const res = await finishMatchAction(match.id)
    setDrawPending(false)
    if (!res.success) {
      setError(res.error ?? 'Не удалось завершить матч')
      return
    }
    router.refresh()
  }, [match.id, router])

  if (isDraw) {
    return (
      <VStack gap={6} align="stretch" py={12}>
        <Box textAlign="center">
          <Heading size="2xl" mb={4}>
            🤝 Ничья
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            Счёт {homeTotal} : {awayTotal}. Победное стихотворение не назначается.
          </Text>
        </Box>
        {error && (
          <Text color="red.fg" fontSize="sm" textAlign="center">
            {error}
          </Text>
        )}
        <Button size="xl" colorPalette="blue" loading={drawPending} onClick={handleFinishDraw} py={7}>
          🏁 Подтвердить и завершить матч
        </Button>
      </VStack>
    )
  }

  return (
    <VStack gap={6} align="stretch" py={6}>
      <Box textAlign="center">
        <Heading size="2xl" mb={2}>
          🏆 Победитель: {winnerTeam?.name}
        </Heading>
        <Text fontSize="xl" color="fg.muted">
          {homeTotal} : {awayTotal}
        </Text>
      </Box>

      <Box textAlign="center">
        <Heading size="lg" mb={3}>
          Выберите поэта для победного стихотворения
        </Heading>
        <Text fontSize="sm" color="fg.muted">
          Один из игроков команды-победителя прочитает стих. Он не оценивается.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} gap={3}>
        {winnerTeam?.players.map((player) => {
          const selected = selectedId === player.id
          return (
            <Box
              key={player.id}
              p={4}
              borderRadius="xl"
              borderWidth="2px"
              borderColor={selected ? 'yellow.solid' : 'border.muted'}
              bg={selected ? 'yellow.subtle' : 'bg.panel'}
              cursor="pointer"
              onClick={() => setSelectedId(player.id)}
              transitionProperty="border-color, background-color"
              transitionDuration="0.2s"
              _hover={{ borderColor: 'yellow.muted' }}
            >
              <Flex justify="space-between" align="center">
                <Text fontWeight="medium" lineClamp={2}>
                  {player.name}
                </Text>
                {selected && (
                  <Badge colorPalette="yellow" size="sm">
                    ✓
                  </Badge>
                )}
              </Flex>
            </Box>
          )
        })}
      </SimpleGrid>

      {error && (
        <Text color="red.fg" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}

      <Button
        size="xl"
        colorPalette="yellow"
        disabled={!selectedId}
        loading={pending}
        onClick={handleConfirm}
        py={7}
        fontSize="lg"
      >
        🏁 Подтвердить и завершить матч
      </Button>
    </VStack>
  )
}
