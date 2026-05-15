/**
 * Расписание матчей — группировка по турам (город-фильтр)
 */

import { FinishedMatchesCollapsible } from '@/app/_components/finished-matches-collapsible'
import { MatchCard } from '@/app/_components/match-card'
import { SeasonSelector } from '@/app/_components/season-selector'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { isMatchPast, isMatchUpcoming } from '@/lib/match-status'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import { Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Params = Promise<{ citySlug: string }>
type SearchParams = Promise<{ season?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return { title: 'Город не найден' }
  }
  return {
    title: `Расписание — ${city.name}`,
    description: `Расписание матчей Кубка Большого Слэма в ${city.name}`,
    alternates: { canonical: `/${citySlug}/schedule` },
  }
}

export default async function SchedulePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const { season: seasonSlug } = await searchParams

  const seasons = await prisma.season.findMany({
    where: { cityId: city.id },
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

  // Загружаем матчи сезона (регулярные через tour, товарищеские через seasonId)
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ tour: { round: { seasonId: currentSeason.id } } }, { seasonId: currentSeason.id }],
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

  // Группируем по кругам и турам (товарищеские — в отдельную группу)
  const grouped = new Map<string, typeof matches>()
  for (const m of matches) {
    const key = m.tour ? `${m.tour.round.name} — Тур ${m.tour.number}` : 'Товарищеские матчи'
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
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
      <SeasonSelector seasons={seasons} currentId={currentSeason.id} basePath={`/${citySlug}/schedule`} />

      {/* Разделяем на будущие и прошедшие */}
      {(() => {
        const isSeasonFinished = currentSeason.status === 'FINISHED'
        const live = matches.filter((m) => m.status === 'LIVE')
        const upcoming = isSeasonFinished ? [] : matches.filter((m) => isMatchUpcoming(m))
        const finished = isSeasonFinished ? matches : matches.filter((m) => isMatchPast(m))

        const renderMatch = (m: (typeof matches)[0]) => (
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
            citySlug={citySlug}
            matchType={m.matchType}
          />
        )

        return (
          <>
            {/* Для завершённого сезона — все матчи списком */}
            {isSeasonFinished && (
              <VStack gap={2} align="stretch">
                {finished.map(renderMatch)}
              </VStack>
            )}

            {/* Для активного сезона — live + прошедшие + ближайшие */}
            {!isSeasonFinished && (
              <>
                {/* Матчи в прямом эфире */}
                {live.length > 0 && (
                  <Box>
                    <Heading size="md" mb={3} color="brand.solid">
                      Сейчас идёт ({live.length})
                    </Heading>
                    <VStack gap={2} align="stretch">
                      {live.map((m) => (
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
                          citySlug={citySlug}
                          matchType={m.matchType}
                          featured
                        />
                      ))}
                    </VStack>
                  </Box>
                )}

                {finished.length > 0 && (
                  <FinishedMatchesCollapsible count={finished.length}>
                    {finished.map(renderMatch)}
                  </FinishedMatchesCollapsible>
                )}

                {upcoming.length > 0 && (
                  <Box>
                    <Heading size="md" mb={3} color="green.fg">
                      Ближайшие матчи ({upcoming.length})
                    </Heading>
                    <VStack gap={2} align="stretch">
                      {upcoming.map(renderMatch)}
                    </VStack>
                  </Box>
                )}
              </>
            )}
          </>
        )
      })()}

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
