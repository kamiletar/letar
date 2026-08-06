/**
 * Таблица истории соперников: группировка по оппонентам, W/D/L, средний балл.
 * Server Component.
 */

import { DataTableWrapper } from '@/app/_components/data-table-wrapper'
import { SectionHeading } from '@/app/_components/section-heading'
import { prisma } from '@/lib/db'
import { Badge, Box, Grid, HStack, Text } from '@chakra-ui/react'

import type { PlayerPerf } from '../_lib/compute-player-stats'

interface PlayerOpponentHistoryProps {
  perfs: PlayerPerf[]
  playerId: string
}

interface OpponentRecord {
  name: string
  encounters: number
  wins: number
  draws: number
  losses: number
  avgScore: number
  avgOpponentScore: number
}

export async function PlayerOpponentHistory({ perfs, playerId }: PlayerOpponentHistoryProps) {
  if (perfs.length === 0) {
    return null
  }

  // Загружаем оппонентов из тех же матчей/раундов
  const allMatchPerfs = await prisma.playerPerformance.findMany({
    where: { matchId: { in: perfs.map((p) => p.match.id) } },
    select: {
      matchId: true,
      half: true,
      roundNumber: true,
      teamSeasonId: true,
      totalScore: true,
      playerId: true,
      player: { select: { name: true } },
    },
  })

  // Группируем по оппонентам
  const opponentMap = new Map<string, { name: string; myScores: number[]; opScores: number[] }>()

  for (const perf of perfs) {
    const opponent = allMatchPerfs.find(
      (op) =>
        op.matchId === perf.match.id
        && op.half === perf.half
        && op.roundNumber === perf.roundNumber
        && op.playerId !== playerId
        && op.totalScore !== null,
    )
    if (!opponent) {
      continue
    }

    const existing = opponentMap.get(opponent.playerId) ?? {
      name: opponent.player.name,
      myScores: [],
      opScores: [],
    }
    existing.myScores.push(perf.totalScore ?? 0)
    existing.opScores.push(opponent.totalScore ?? 0)
    opponentMap.set(opponent.playerId, existing)
  }

  if (opponentMap.size === 0) {
    return null
  }

  // Вычисляем статистику
  const records: OpponentRecord[] = []
  for (const [, val] of opponentMap) {
    let wins = 0
    let draws = 0
    let losses = 0
    for (let i = 0; i < val.myScores.length; i++) {
      if (val.myScores[i] > val.opScores[i]) {
        wins++
      } else if (val.myScores[i] === val.opScores[i]) {
        draws++
      } else {
        losses++
      }
    }
    records.push({
      name: val.name,
      encounters: val.myScores.length,
      wins,
      draws,
      losses,
      avgScore: Math.round((val.myScores.reduce((s, v) => s + v, 0) / val.myScores.length) * 10) / 10,
      avgOpponentScore: Math.round((val.opScores.reduce((s, v) => s + v, 0) / val.opScores.length) * 10) / 10,
    })
  }

  // Сортировка: по количеству встреч (убывание)
  records.sort((a, b) => b.encounters - a.encounters)

  return (
    <Box>
      <SectionHeading mb={3}>История соперников</SectionHeading>
      <DataTableWrapper>
        <Grid templateColumns="1fr 70px 100px 70px 70px" gap={0} fontSize="sm" minW="400px">
          {['Соперник', 'Встречи', 'W / D / L', 'Ср. балл', 'Соперник'].map((h) => (
            <Box
              key={h}
              px={3}
              py={2}
              fontWeight="bold"
              fontSize="xs"
              textTransform="uppercase"
              letterSpacing="wide"
              bg={{ base: 'gray.100', _dark: 'brand.950' }}
              color={{ base: 'fg.muted', _dark: 'gray.300' }}
              borderBottomWidth="2px"
              borderBottomColor="brand.solid"
            >
              {h}
            </Box>
          ))}
          {records.map((r, i) => (
            <Box key={r.name} display="contents">
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                <Text fontWeight="medium">{r.name}</Text>
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {r.encounters}
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                <HStack gap={1} justify="center">
                  <Badge colorPalette="green" size="sm" variant="subtle">
                    {r.wins}
                  </Badge>
                  <Badge colorPalette="gray" size="sm" variant="subtle">
                    {r.draws}
                  </Badge>
                  <Badge colorPalette="red" size="sm" variant="subtle">
                    {r.losses}
                  </Badge>
                </HStack>
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontWeight="bold"
                fontFamily="mono"
                color="brand.solid"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {r.avgScore}
              </Box>
              <Box
                px={3}
                py={2}
                borderBottomWidth="1px"
                borderBottomColor="border.muted"
                textAlign="center"
                fontFamily="mono"
                color="fg.muted"
                bg={i % 2 === 1 ? 'bg.subtle' : undefined}
              >
                {r.avgOpponentScore}
              </Box>
            </Box>
          ))}
        </Grid>
      </DataTableWrapper>
    </Box>
  )
}
