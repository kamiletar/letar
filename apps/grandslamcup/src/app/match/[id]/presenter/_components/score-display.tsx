'use client'

/**
 * Отображение результатов голосования для ведущего
 *
 * После TEXT_COMPLETE: "Текст: 13"
 * После DELIVERY_COMPLETE: "Подача: 12. Итого: 25"
 * Именные оценки: "Анна: 4, Дмитрий: 5, Олег: 2"
 * Крупный шрифт — для озвучивания со сцены.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Box, Text, VStack } from '@chakra-ui/react'

interface Vote {
  judgeName: string
  judgeNumber: number
  dimension: string
  score: number
}

interface Performance {
  id: string
  half: number
  roundNumber: number
  playerName: string
  teamSeasonId: string
  textAdjusted: number | null
  deliveryAdjusted: number | null
  totalScore: number | null
  votes: Vote[]
}

interface ScoreDisplayProps {
  matchState: MatchSSEState | null
  performances: Performance[]
  homeTeamId: string
  awayTeamId: string
  homeTeamName: string
  awayTeamName: string
}

export function ScoreDisplay({
  matchState,
  performances,
  homeTeamId,
  awayTeamId,
  homeTeamName,
  awayTeamName,
}: ScoreDisplayProps) {
  if (!matchState) {
    return null
  }

  const { phase, currentPerformances, currentPerformerIndex } = matchState

  // Находим текущий перформанс
  const currentPerf = currentPerformances[currentPerformerIndex]
  if (!currentPerf) {
    return null
  }

  // Ищем данные перформанса в БД-данных
  const perfData = performances.find((p) => p.id === currentPerf.performanceId)

  // Определяем имена судей из последнего vote:complete / score:calculated
  const textVotes = perfData?.votes.filter((v) => v.dimension === 'TEXT').sort((a, b) => a.judgeNumber - b.judgeNumber)
    ?? []
  const deliveryVotes =
    perfData?.votes.filter((v) => v.dimension === 'DELIVERY').sort((a, b) => a.judgeNumber - b.judgeNumber) ?? []

  // Текущий счёт команд (для озвучивания)
  let homeTotal = 0
  let awayTotal = 0
  for (const p of performances) {
    if (p.totalScore !== null) {
      if (p.teamSeasonId === homeTeamId) {
        homeTotal += p.totalScore
      } else if (p.teamSeasonId === awayTeamId) {
        awayTotal += p.totalScore
      }
    }
  }

  const teamName = currentPerf.teamName
  const isComplete = phase === 'TEXT_COMPLETE' || phase === 'DELIVERY_COMPLETE' || phase === 'ROUND_COMPLETE'

  if (!isComplete) {
    return null
  }

  return (
    <VStack gap={3} w="full" align="start">
      {/* Имя поэта */}
      <Text fontSize="lg" fontWeight="bold" color="fg.muted">
        {currentPerf.playerName} ({teamName})
      </Text>

      {/* Результат текста */}
      {perfData?.textAdjusted !== null && perfData?.textAdjusted !== undefined && (
        <Box w="full">
          <Text fontSize="2xl" fontWeight="bold">
            Текст: {perfData.textAdjusted}
          </Text>
          {textVotes.length > 0 && (
            <Text fontSize="sm" color="fg.muted">
              {textVotes.map((v) => `${v.judgeName}: ${v.score}`).join(', ')}
            </Text>
          )}
        </Box>
      )}

      {/* Результат подачи + итого */}
      {perfData?.deliveryAdjusted !== null && perfData?.deliveryAdjusted !== undefined && (
        <Box w="full">
          <Text fontSize="2xl" fontWeight="bold">
            Подача: {perfData.deliveryAdjusted}. Итого: {perfData.totalScore}
          </Text>
          {deliveryVotes.length > 0 && (
            <Text fontSize="sm" color="fg.muted">
              {deliveryVotes.map((v) => `${v.judgeName}: ${v.score}`).join(', ')}
            </Text>
          )}
        </Box>
      )}

      {/* Общий счёт команд */}
      {perfData?.totalScore !== null && (
        <Box bg="bg.subtle" borderRadius="lg" p={3} w="full" mt={1}>
          <Text fontSize="lg" fontWeight="bold" textAlign="center">
            {homeTeamName} {homeTotal} : {awayTotal} {awayTeamName}
          </Text>
        </Box>
      )}
    </VStack>
  )
}
