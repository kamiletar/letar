/**
 * Расписание матчей — группировка по турам
 */

import { prisma } from '@/lib/db'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

import { MatchCard } from '../../_components/match-card'
import { SeasonSelector } from '../../_components/season-selector'

export const metadata: Metadata = {
  title: 'Расписание',
  description: 'Расписание матчей Кубка Большого Слэма',
  alternates: { canonical: '/schedule' },
}

type SearchParams = Promise<{ season?: string }>

export default async function SchedulePage({ searchParams }: { searchParams: SearchParams }) {
  const { season: seasonSlug } = await searchParams

  const seasons = await prisma.season.findMany({
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, slug: true, status: true },
  })

  const currentSeason = seasonSlug
    ? seasons.find((s) => s.slug === seasonSlug)
    : (seasons.find((s) => s.status === 'ACTIVE') ?? seasons[0])

  if (!currentSeason) {
    return (
      <VStack py={12}>
        <Text color="fg.muted">Сезоны пока не созданы</Text>
      </VStack>
    )
  }

  // Загружаем матчи сезона с группировкой по турам
  const matches = await prisma.match.findMany({
    where: {
      tour: { round: { seasonId: currentSeason.id } },
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      ...MATCH_TEAMS_NAME,
      venue: { select: { name: true } },
      league: { select: { name: true } },
      tour: {
        include: {
          round: { select: { name: true, number: true } },
        },
      },
    },
  })

  // Группируем по кругам и турам
  const grouped = new Map<string, typeof matches>()
  for (const m of matches) {
    const key = m.tour ? `${m.tour.round.name} — Тур ${m.tour.number}` : 'Товарищеские матчи'
    if (!grouped.has(key)) { grouped.set(key, []) }
    grouped.get(key)!.push(m)
  }

  return (
    <VStack gap={8} align="stretch">
      <Flex justify="space-between" align="center">
        <Heading as="h1" size="xl">
          Расписание
        </Heading>
        <Box asChild>
          <a href={`/api/schedule/ical${currentSeason ? `?season=${currentSeason.id}` : ''}`} download>
            <Text fontSize="sm" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
              Добавить в календарь
            </Text>
          </a>
        </Box>
      </Flex>

      {/* Выбор сезона */}
      <SeasonSelector seasons={seasons} currentId={currentSeason.id} basePath="/schedule" />

      {/* Матчи по турам */}
      {[...grouped.entries()].map(([tourLabel, tourMatches]) => (
        <Box key={tourLabel}>
          <Heading size="md" mb={3}>
            {tourLabel}
          </Heading>
          <VStack gap={2} align="stretch">
            {tourMatches.map((m) => (
              <MatchCard
                key={m.id}
                id={m.id}
                homeTeamName={m.homeTeam.team.name}
                awayTeamName={m.awayTeam.team.name}
                homeScore={m.homeScore}
                awayScore={m.awayScore}
                status={m.status}
                scheduledAt={m.scheduledAt}
                venueName={m.venue?.name ?? null}
              />
            ))}
          </VStack>
        </Box>
      ))}

      {matches.length === 0 && (
        <VStack py={8} textAlign="center" bg="bg.subtle" borderRadius="xl" gap={2}>
          <Text fontSize="lg" color="fg.muted">
            Матчи пока не запланированы
          </Text>
          <Text fontSize="sm" color="fg.subtle">
            Расписание появится после жеребьёвки
          </Text>
        </VStack>
      )}
    </VStack>
  )
}
