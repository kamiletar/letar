/**
 * Дашборд поэта — команда, статистика выступлений, ближайшие матчи, стихи
 */

import { prisma } from '@/lib/db'
import { formatDate, formatDateTimeFull } from '@/lib/format-date'
import { requirePoet } from '@/lib/roles'
import { Badge, Box, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

export default async function PoetDashboardPage() {
  const poet = await requirePoet()

  // Текущая команда поэта
  const teamSeason = await prisma.playerTeamSeason.findFirst({
    where: {
      playerId: poet.playerId,
      leftAt: null,
      teamSeason: { season: { status: 'ACTIVE' } },
    },
    include: {
      teamSeason: {
        include: {
          team: { select: { name: true } },
          league: { select: { name: true } },
          season: { select: { name: true } },
        },
      },
    },
  })

  // Статистика выступлений
  const performances = await prisma.playerPerformance.findMany({
    where: { playerId: poet.playerId, totalScore: { not: null } },
    orderBy: { match: { scheduledAt: 'desc' } },
    select: { totalScore: true },
  })

  const totalPerformances = performances.length
  const avgScore =
    totalPerformances > 0 ? performances.reduce((sum, p) => sum + (p.totalScore ?? 0), 0) / totalPerformances : 0
  const bestScore = totalPerformances > 0 ? Math.max(...performances.map((p) => p.totalScore ?? 0)) : 0
  // Тренд: среднее последних 3 vs предыдущих 3
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (totalPerformances >= 6) {
    const recent3 = performances.slice(0, 3).reduce((s, p) => s + (p.totalScore ?? 0), 0) / 3
    const prev3 = performances.slice(3, 6).reduce((s, p) => s + (p.totalScore ?? 0), 0) / 3
    if (recent3 > prev3 + 0.5) {
      trend = 'up'
    } else if (recent3 < prev3 - 0.5) {
      trend = 'down'
    }
  }

  // Ближайшие матчи команды (если есть команда)
  const upcomingMatches = teamSeason
    ? await prisma.match.findMany({
        where: {
          status: 'SCHEDULED',
          OR: [{ homeTeamId: teamSeason.teamSeasonId }, { awayTeamId: teamSeason.teamSeasonId }],
        },
        include: {
          homeTeam: { include: { team: { select: { name: true } } } },
          awayTeam: { include: { team: { select: { name: true } } } },
          venue: { select: { name: true } },
          lineups: {
            where: { playerId: poet.playerId },
            select: { id: true },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 5,
      })
    : []

  // Последние стихи
  const poems = await prisma.poem.findMany({
    where: { playerId: poet.playerId },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, title: true, slug: true, published: true, createdAt: true },
  })

  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">Дашборд</Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
        {/* Моя команда */}
        <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
          <Heading size="md" mb={3}>
            Моя команда
          </Heading>
          {teamSeason ? (
            <VStack gap={2} align="stretch">
              <Flex justify="space-between">
                <Text color="fg.muted" fontSize="sm">
                  Команда
                </Text>
                <Text fontSize="sm" fontWeight="semibold">
                  {teamSeason.teamSeason.team.name}
                </Text>
              </Flex>
              <Flex justify="space-between">
                <Text color="fg.muted" fontSize="sm">
                  Лига
                </Text>
                <Text fontSize="sm">{teamSeason.teamSeason.league?.name ?? '—'}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text color="fg.muted" fontSize="sm">
                  Сезон
                </Text>
                <Text fontSize="sm">{teamSeason.teamSeason.season.name}</Text>
              </Flex>
            </VStack>
          ) : (
            <Text color="fg.muted" fontSize="sm">
              Вы не состоите в команде в текущем сезоне
            </Text>
          )}
        </Box>

        {/* Статистика */}
        <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
          <Heading size="md" mb={3}>
            Статистика
          </Heading>
          <SimpleGrid columns={2} gap={3}>
            <Box textAlign="center">
              <Text fontSize="xs" color="fg.muted">
                Выступлений
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {totalPerformances}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="fg.muted">
                Средний балл
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="teal.fg">
                {avgScore > 0 ? avgScore.toFixed(1) : '—'}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="fg.muted">
                Лучший балл
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {bestScore > 0 ? bestScore : '—'}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="fg.muted">
                Тренд
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {trend === 'up' && (
                  <Badge colorPalette="green" size="lg">
                    ↑
                  </Badge>
                )}
                {trend === 'down' && (
                  <Badge colorPalette="red" size="lg">
                    ↓
                  </Badge>
                )}
                {trend === 'stable' && (
                  <Badge colorPalette="gray" size="lg">
                    →
                  </Badge>
                )}
              </Text>
            </Box>
          </SimpleGrid>
        </Box>
      </SimpleGrid>

      {/* Ближайшие выступления */}
      <Box>
        <Heading size="md" mb={3}>
          Ближайшие матчи
        </Heading>
        {upcomingMatches.length === 0 ? (
          <Box bg="bg.panel" p={6} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Нет запланированных матчей</Text>
          </Box>
        ) : (
          <VStack gap={3} align="stretch">
            {upcomingMatches.map((match) => {
              const isHome = match.homeTeamId === teamSeason?.teamSeasonId
              const opponent = isHome ? match.awayTeam.team.name : match.homeTeam.team.name
              const inLineup = match.lineups.length > 0

              return (
                <Box key={match.id} bg="bg.panel" borderRadius="xl" p={4} borderWidth="1px" borderColor="border.muted">
                  <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                    <Box>
                      <Text fontWeight="semibold">
                        vs {opponent} ({isHome ? 'дома' : 'в гостях'})
                      </Text>
                      <Text fontSize="sm" color="fg.muted">
                        {match.venue?.name ?? '—'}
                        {match.scheduledAt && ` · ${formatDateTimeFull(match.scheduledAt)}`}
                      </Text>
                    </Box>
                    {inLineup ? (
                      <Badge colorPalette="green" size="sm">
                        В заявке
                      </Badge>
                    ) : (
                      <Badge colorPalette="gray" size="sm">
                        Не в заявке
                      </Badge>
                    )}
                  </Flex>
                </Box>
              )
            })}
          </VStack>
        )}
      </Box>

      {/* Последние стихи */}
      <Box>
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="md">Последние стихи</Heading>
          <Link href="/poet/poems">
            <Text fontSize="sm" color="teal.fg" _hover={{ textDecoration: 'underline' }}>
              Все стихи
            </Text>
          </Link>
        </Flex>
        {poems.length === 0 ? (
          <Box bg="bg.panel" p={6} borderRadius="xl" textAlign="center">
            <Text color="fg.muted">У вас пока нет стихов</Text>
          </Box>
        ) : (
          <VStack gap={3} align="stretch">
            {poems.map((poem) => (
              <Box key={poem.id} bg="bg.panel" borderRadius="xl" p={4} borderWidth="1px" borderColor="border.muted">
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="semibold">{poem.title}</Text>
                    <Text fontSize="xs" color="fg.muted">
                      {formatDate(poem.createdAt)}
                    </Text>
                  </Box>
                  <Badge colorPalette={poem.published ? 'green' : 'gray'} size="sm">
                    {poem.published ? 'Опубликовано' : 'Черновик'}
                  </Badge>
                </Flex>
              </Box>
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  )
}
