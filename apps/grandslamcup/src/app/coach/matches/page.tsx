/**
 * Матчи команды — кабинет тренера
 */

import { prisma } from '@/lib/db'
import { getDisplayStatus, matchStatusColors, matchStatusLabels } from '@/lib/match-status'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import { requireCoach } from '@/lib/roles'
import { Badge, Box, Button, Heading, Table, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

export default async function CoachMatchesPage() {
  const coach = await requireCoach()

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ homeTeamId: coach.teamSeasonId }, { awayTeamId: coach.teamSeasonId }],
    },
    include: {
      ...MATCH_TEAMS_NAME,
      venue: { select: { name: true } },
      tour: {
        select: { number: true, round: { select: { number: true } } },
      },
      lineups: {
        where: { teamSeasonId: coach.teamSeasonId },
        select: { id: true },
      },
    },
    orderBy: { scheduledAt: 'desc' },
  })

  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">Матчи ({matches.length})</Heading>

      {matches.length === 0
        ? (
          <Box bg="bg.panel" p={8} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Матчей пока нет</Text>
          </Box>
        )
        : (
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" overflow="hidden">
            <Box overflowX="auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Круг / Тур</Table.ColumnHeader>
                    <Table.ColumnHeader>Соперник</Table.ColumnHeader>
                    <Table.ColumnHeader>Счёт</Table.ColumnHeader>
                    <Table.ColumnHeader>Площадка</Table.ColumnHeader>
                    <Table.ColumnHeader>Статус</Table.ColumnHeader>
                    <Table.ColumnHeader>Заявка</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {matches.map((match) => {
                    const isHome = match.homeTeamId === coach.teamSeasonId
                    const opponent = isHome ? match.awayTeam.team.name : match.homeTeam.team.name
                    const hasLineup = match.lineups.length > 0

                    return (
                      <Table.Row key={match.id}>
                        <Table.Cell fontSize="sm" color="fg.muted">
                          {match.tour ? `К${match.tour.round.number} / Т${match.tour.number}` : '—'}
                        </Table.Cell>
                        <Table.Cell fontWeight="medium">
                          {isHome ? 'vs' : '@'} {opponent}
                        </Table.Cell>
                        <Table.Cell fontWeight="bold" textAlign="center">
                          {match.status === 'FINISHED' || match.status === 'LIVE'
                            ? isHome
                              ? `${match.homeScore} : ${match.awayScore}`
                              : `${match.awayScore} : ${match.homeScore}`
                            : '— : —'}
                        </Table.Cell>
                        <Table.Cell fontSize="sm" color="fg.muted">
                          {match.venue?.name ?? '—'}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={matchStatusColors[getDisplayStatus(match)]} size="sm">
                            {matchStatusLabels[getDisplayStatus(match)]}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          {match.status === 'SCHEDULED'
                            ? (
                              <Button asChild size="xs" variant={hasLineup ? 'outline' : 'solid'} colorPalette="blue">
                                <Link href={`/coach/matches/${match.id}/lineup`}>
                                  {hasLineup ? `${match.lineups.length} чел.` : 'Подать'}
                                </Link>
                              </Button>
                            )
                            : (
                              <Badge colorPalette={hasLineup ? 'green' : 'gray'} size="sm">
                                {hasLineup ? `${match.lineups.length} чел.` : '—'}
                              </Badge>
                            )}
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        )}
    </VStack>
  )
}
