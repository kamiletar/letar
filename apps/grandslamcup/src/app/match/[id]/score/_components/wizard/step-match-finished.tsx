'use client'

/**
 * Шаг 12 (финал): Матч завершён.
 *
 * Показывает итоговый счёт, победителя, MVP матча и имя поэта победного стиха.
 * Кнопка возврата на публичную страницу матча.
 */

import { findMatchMVP } from '@/lib/scoring'
import { Badge, Box, Button, Heading, Stack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuExternalLink } from 'react-icons/lu'
import type { MatchData } from '../scorer-client'

interface StepMatchFinishedProps {
  match: MatchData & { victoryPoemPlayerName: string | null }
}

export function StepMatchFinished({ match }: StepMatchFinishedProps) {
  const homeTotal = match.performances
    .filter((p) => p.teamSeasonId === match.homeTeam.id && p.totalScore !== null)
    .reduce((sum, p) => sum + (p.totalScore ?? 0), 0)
  const awayTotal = match.performances
    .filter((p) => p.teamSeasonId === match.awayTeam.id && p.totalScore !== null)
    .reduce((sum, p) => sum + (p.totalScore ?? 0), 0)

  const winnerName = homeTotal > awayTotal ? match.homeTeam.name : awayTotal > homeTotal ? match.awayTeam.name : 'Ничья'

  const mvp = findMatchMVP(match.performances)

  return (
    <VStack gap={6} align="stretch" py={12}>
      <Box textAlign="center">
        <Heading size="4xl" mb={4}>
          🏁 Матч завершён
        </Heading>
      </Box>

      <Box textAlign="center" bg="blue.subtle" p={8} borderRadius="2xl" borderWidth="2px" borderColor="blue.solid">
        <Text fontSize="sm" color="fg.muted" mb={2}>
          {match.homeTeam.name} vs {match.awayTeam.name}
        </Text>
        <Heading size="4xl" fontFamily="mono">
          {homeTotal} : {awayTotal}
        </Heading>
        <Badge colorPalette="green" size="lg" mt={3} fontSize="lg">
          🏆 Победитель: {winnerName}
        </Badge>
      </Box>

      <Stack gap={4} direction={{ base: 'column', md: 'row' }}>
        {mvp && (
          <Box
            flex={1}
            p={4}
            bg="yellow.subtle"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="yellow.muted"
            textAlign="center"
          >
            <Text fontSize="xs" color="fg.muted" mb={1}>
              ⭐ MVP матча
            </Text>
            <Text fontSize="lg" fontWeight="bold" lineClamp={2}>
              {mvp.playerName}
            </Text>
            <Badge colorPalette="yellow" size="md" mt={1}>
              {mvp.totalScore} баллов
            </Badge>
          </Box>
        )}

        {match.victoryPoemPlayerName && (
          <Box
            flex={1}
            p={4}
            bg="purple.subtle"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="purple.muted"
            textAlign="center"
          >
            <Text fontSize="xs" color="fg.muted" mb={1}>
              📜 Победное стихотворение
            </Text>
            <Text fontSize="lg" fontWeight="bold" lineClamp={2}>
              {match.victoryPoemPlayerName}
            </Text>
          </Box>
        )}
      </Stack>

      <Stack direction={{ base: 'column', md: 'row' }} gap={3} justify="center">
        <Button asChild size="lg" colorPalette="blue" variant="outline">
          <Link href={match.citySlug ? `/${match.citySlug}/matches/${match.id}` : `/match/${match.id}`}>
            <LuExternalLink /> На публичную страницу
          </Link>
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href="/my/scorer-matches">К списку матчей</Link>
        </Button>
      </Stack>
    </VStack>
  )
}
