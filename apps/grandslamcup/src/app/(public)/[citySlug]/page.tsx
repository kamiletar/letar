/**
 * Главная страница города — герой, ближайшие матчи, таблица, результаты.
 * Данные фильтруются по городу. Секции вынесены в _components/.
 */

import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { Badge, Box, Button, Circle, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuArrowRight, LuCalendarDays, LuTrophy } from 'react-icons/lu'

import { CityMiniStandings, type StandingsRow } from './_components/city-mini-standings'
import { CityRecentResults } from './_components/city-recent-results'
import { CityUpcomingMatches } from './_components/city-upcoming-matches'

type Params = Promise<{ citySlug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  return {
    title: city ? city.name : 'Grand Slam Cup',
    description: city ? `Поэтические турниры в ${city.name}` : undefined,
    alternates: { canonical: `/${citySlug}` },
  }
}

export default async function CityHomePage({ params }: { params: Params }) {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const [upcomingMatches, recentResults, activeSeason] = await Promise.all([
    prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: new Date() },
        OR: [{ tour: { round: { season: { cityId: city.id } } } }, { season: { cityId: city.id } }],
      },
      orderBy: { scheduledAt: 'asc' },
      take: 4,
      include: {
        homeTeam: { include: { team: { select: { name: true } } } },
        awayTeam: { include: { team: { select: { name: true } } } },
        venue: { select: { name: true } },
      },
    }),
    prisma.match.findMany({
      where: {
        status: 'FINISHED',
        OR: [{ tour: { round: { season: { cityId: city.id } } } }, { season: { cityId: city.id } }],
      },
      orderBy: { scheduledAt: 'desc' },
      take: 4,
      include: {
        homeTeam: { include: { team: { select: { name: true } } } },
        awayTeam: { include: { team: { select: { name: true } } } },
        venue: { select: { name: true } },
      },
    }),
    prisma.season.findFirst({
      where: { status: 'ACTIVE', cityId: city.id },
      include: {
        teamSeasons: {
          include: {
            team: { select: { name: true, slug: true } },
            league: { select: { name: true } },
          },
        },
      },
    }),
  ])

  /* Подсчёт таблицы для активного сезона */
  const standings = await computeStandings(activeSeason)

  const cityPrefix = `/${citySlug}`

  return (
    <VStack gap={10} align="stretch">
      {/* Герой-блок */}
      <Box
        bg="brand.950"
        bgGradient="to-br"
        gradientFrom="brand.950"
        gradientTo="brand.900"
        borderRadius="2xl"
        px={{ base: 6, md: 10 }}
        py={{ base: 10, md: 16 }}
        textAlign="center"
        position="relative"
        overflow="hidden"
      >
        {/* Точечный паттерн */}
        <Box
          position="absolute"
          inset={0}
          opacity={0.05}
          backgroundImage="radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)"
          backgroundSize="24px 24px"
          pointerEvents="none"
        />
        {/* Декоративный круг — правый верх */}
        <Box
          position="absolute"
          top="-80px"
          right="-80px"
          w="280px"
          h="280px"
          borderRadius="full"
          bg="brand.700"
          opacity={0.25}
          filter="blur(40px)"
          pointerEvents="none"
        />
        {/* Декоративный круг — левый низ */}
        <Box
          position="absolute"
          bottom="-60px"
          left="-40px"
          w="200px"
          h="200px"
          borderRadius="full"
          bg="accent.700"
          opacity={0.15}
          filter="blur(40px)"
          pointerEvents="none"
        />
        <VStack gap={5} position="relative">
          <Heading
            as="h1"
            className="fade-in-up"
            size={{ base: '3xl', md: '5xl' }}
            color="white"
            letterSpacing="tight"
            lineHeight="1.1"
          >
            Grand Slam{' '}
            <Box color="brand.400" display="inline">
              Cup
            </Box>
          </Heading>
          <Heading
            className="fade-in-up stagger-1"
            size={{ base: 'xl', md: '2xl' }}
            color="brand.200"
            fontWeight="medium"
          >
            {city.name}
          </Heading>
          {activeSeason && (
            <Badge
              className="fade-in-up stagger-2"
              colorPalette="brand"
              variant="subtle"
              size="lg"
              px={4}
              py={1.5}
              borderRadius="full"
              fontSize="sm"
            >
              <LuTrophy size={14} style={{ marginRight: 6 }} />
              {activeSeason.name}
            </Badge>
          )}
          <HStack gap={4} mt={3} className="fade-in-up stagger-3">
            <Link href={`${cityPrefix}/standings`}>
              <Button size={{ base: 'md', md: 'lg' }} colorPalette="brand" variant="solid">
                <LuTrophy />
                Таблица
                <LuArrowRight size={16} />
              </Button>
            </Link>
            <Link href={`${cityPrefix}/schedule`}>
              <Button
                size={{ base: 'md', md: 'lg' }}
                variant="outline"
                color="white"
                borderColor="brand.400"
                _hover={{ bg: 'brand.800' }}
              >
                <LuCalendarDays />
                Расписание
              </Button>
            </Link>
          </HStack>
        </VStack>
      </Box>

      {/* Секции */}
      <CityUpcomingMatches matches={upcomingMatches} citySlug={citySlug} />

      {activeSeason && <CityMiniStandings standings={standings} seasonName={activeSeason.name} citySlug={citySlug} />}

      <CityRecentResults matches={recentResults} citySlug={citySlug} />

      {/* Пустое состояние — нет ни матчей, ни результатов */}
      {upcomingMatches.length === 0 && recentResults.length === 0 && (
        <VStack py={16} textAlign="center" gap={4} className="fade-in-up">
          <Circle size={20} bg="brand.50" _dark={{ bg: 'brand.950' }}>
            <LuCalendarDays size={40} color="var(--chakra-colors-brand-solid)" />
          </Circle>
          <Heading size="md" color="fg.muted">
            Матчи пока не запланированы
          </Heading>
          <Text fontSize="sm" color="fg.subtle" maxW="400px">
            Следите за обновлениями — скоро начнётся новый сезон!
          </Text>
          <Link href={`${cityPrefix}/schedule`}>
            <Button variant="outline" colorPalette="brand" size="sm" mt={2}>
              <LuCalendarDays />
              Расписание
            </Button>
          </Link>
        </VStack>
      )}
    </VStack>
  )
}

// ---------------------------------------------------------------------------
// Вспомогательная функция — подсчёт таблицы по матчам сезона
// ---------------------------------------------------------------------------

type ActiveSeason = Awaited<
  ReturnType<
    typeof prisma.season.findFirst<{
      include: {
        teamSeasons: {
          include: {
            team: { select: { name: true; slug: true } }
            league: { select: { name: true } }
          }
        }
      }
    }>
  >
>

async function computeStandings(activeSeason: ActiveSeason): Promise<StandingsRow[]> {
  if (!activeSeason) return []

  const seasonMatches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      matchType: 'REGULAR',
      tour: { round: { seasonId: activeSeason.id } },
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      homePoints: true,
      awayPoints: true,
    },
  })

  const statsMap = new Map<
    string,
    { played: number; won: number; drawn: number; lost: number; scored: number; conceded: number; points: number }
  >()

  for (const m of seasonMatches) {
    const home = statsMap.get(m.homeTeamId) ?? {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      scored: 0,
      conceded: 0,
      points: 0,
    }
    home.played++
    home.scored += m.homeScore
    home.conceded += m.awayScore
    home.points += m.homePoints ?? 0
    if ((m.homePoints ?? 0) === 1) {
      home.won++
    } else if ((m.homePoints ?? 0) === 0.5) {
      home.drawn++
    } else {
      home.lost++
    }
    statsMap.set(m.homeTeamId, home)

    const away = statsMap.get(m.awayTeamId) ?? {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      scored: 0,
      conceded: 0,
      points: 0,
    }
    away.played++
    away.scored += m.awayScore
    away.conceded += m.homeScore
    away.points += m.awayPoints ?? 0
    if ((m.awayPoints ?? 0) === 1) {
      away.won++
    } else if ((m.awayPoints ?? 0) === 0.5) {
      away.drawn++
    } else {
      away.lost++
    }
    statsMap.set(m.awayTeamId, away)
  }

  return activeSeason.teamSeasons
    .map((ts) => ({
      teamName: ts.team.name,
      teamSlug: ts.team.slug,
      ...(statsMap.get(ts.id) ?? { played: 0, won: 0, drawn: 0, lost: 0, scored: 0, conceded: 0, points: 0 }),
    }))
    .sort((a, b) => b.points - a.points || b.scored - b.conceded - (a.scored - a.conceded))
    .slice(0, 5)
}
