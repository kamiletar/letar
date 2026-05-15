'use client'

/**
 * Экран START_MATCH: ожидание начала матча.
 *
 * Показывает подпись матча и составы команд (обновляются через SSE когда скорер выбирает игроков).
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Badge, Box, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'

interface PresenterStartMatchProps {
  match: {
    season: string
    tour: string
    venue: string | null
    homeTeam: { name: string; players: Array<{ id: string; name: string; status: string }> }
    awayTeam: { name: string; players: Array<{ id: string; name: string; status: string }> }
  }
  matchState: MatchSSEState | null
}

export function PresenterStartMatch({ match }: PresenterStartMatchProps) {
  return (
    <VStack gap={6} align="stretch" py={8} textAlign="center">
      <Box>
        <Heading size="3xl" mb={2}>
          ⏳ Ожидание начала матча
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {match.season} · {match.tour}
          {match.venue ? ` · ${match.venue}` : ''}
        </Text>
      </Box>

      <SimpleGrid columns={2} gap={4}>
        <TeamLineup team={match.homeTeam} palette="blue" />
        <TeamLineup team={match.awayTeam} palette="orange" />
      </SimpleGrid>
    </VStack>
  )
}

function TeamLineup({
  team,
  palette,
}: {
  team: { name: string; players: Array<{ id: string; name: string; status: string }> }
  palette: string
}) {
  return (
    <Box p={4} borderRadius="xl" borderWidth="2px" borderColor={`${palette}.muted`} bg="bg.panel">
      <Text fontWeight="bold" fontSize="md" color={`${palette}.fg`} mb={3} textAlign="center">
        {team.name}
      </Text>
      {team.players.length === 0 ? (
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Состав не объявлен
        </Text>
      ) : (
        <VStack gap={1} align="stretch">
          {team.players.map((p) => (
            <HStack key={p.id} justify="space-between">
              <Text fontSize="sm" truncate>
                {p.name}
              </Text>
              {p.status === 'CAPTAIN' && (
                <Badge colorPalette={palette} size="sm">
                  К
                </Badge>
              )}
            </HStack>
          ))}
        </VStack>
      )}
    </Box>
  )
}
