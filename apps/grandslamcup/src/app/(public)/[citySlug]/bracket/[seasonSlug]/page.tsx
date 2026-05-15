/**
 * Публичная турнирная сетка — Swiss bracket + Double Elimination.
 *
 * Автоматический выбор:
 * - Если сезон SWISS и нет BracketSlot → показать Swiss bracket (W-L дерево)
 * - Если есть BracketSlot → показать DE bracket (плей-офф)
 * - Если оба → Swiss сверху + DE снизу
 */

import { TournamentBracket, transformSlotsToSections } from '@/app/_components/bracket'
import { SwissBracket } from '@/app/_components/swiss-bracket'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { buildSwissBracket, type SwissMatchRow } from '@/lib/swiss-bracket'
import { Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Params = Promise<{ citySlug: string; seasonSlug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug, seasonSlug } = await params
  const city = await getCityBySlug(citySlug)
  const season = await prisma.season.findUnique({
    where: { slug: seasonSlug },
    select: { name: true },
  })
  const cityName = city ? ` — ${city.name}` : ''
  return {
    title: season ? `Сетка — ${season.name}${cityName}` : 'Сетка не найдена',
    alternates: { canonical: `/${citySlug}/bracket/${seasonSlug}` },
  }
}

export default async function PublicBracketPage({ params }: { params: Params }) {
  const { citySlug, seasonSlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const season = await prisma.season.findUnique({
    where: { slug: seasonSlug },
    select: { id: true, name: true, format: true },
  })

  if (!season) {
    notFound()
  }

  // Загружаем BracketSlot (DE плей-офф)
  const slots = await prisma.bracketSlot.findMany({
    where: { seasonId: season.id },
    include: {
      stage: { select: { type: true, name: true, order: true } },
      teamSeason: {
        include: { team: { select: { name: true, slug: true } } },
      },
      match: {
        select: {
          id: true,
          status: true,
          homeScore: true,
          awayScore: true,
          homeTeamId: true,
          awayTeamId: true,
        },
      },
      sourceSlot1: {
        select: {
          id: true,
          teamSeasonId: true,
          teamSeason: { include: { team: { select: { name: true, slug: true } } } },
        },
      },
      sourceSlot2: {
        select: {
          id: true,
          teamSeasonId: true,
          teamSeason: { include: { team: { select: { name: true, slug: true } } } },
        },
      },
    },
    orderBy: [{ stage: { order: 'asc' } }, { roundNumber: 'asc' }, { slotNumber: 'asc' }],
  })

  const hasDeBracket = slots.length > 0

  // Загружаем матчи для Swiss bracket (если формат SWISS)
  let swissData = null
  if (season.format === 'SWISS') {
    const matches = await prisma.match.findMany({
      where: {
        tour: { round: { seasonId: season.id } },
      },
      select: {
        id: true,
        status: true,
        homeScore: true,
        awayScore: true,
        scheduledAt: true,
        homeTeam: {
          select: {
            id: true,
            team: { select: { name: true, slug: true } },
          },
        },
        awayTeam: {
          select: {
            id: true,
            team: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    swissData = buildSwissBracket(matches as unknown as SwissMatchRow[])
  }

  // Нет ни Swiss матчей, ни DE сетки
  if (!swissData?.rounds.length && !hasDeBracket) {
    return (
      <VStack gap={4} py={12} textAlign="center">
        <Heading size="lg">Турнирная сетка</Heading>
        <Text color="fg.muted">Сетка ещё не сформирована</Text>
      </VStack>
    )
  }

  return (
    <VStack gap={8} align="stretch">
      {/* Swiss bracket (W-L дерево раундов) */}
      {swissData && swissData.rounds.length > 0 && (
        <SwissBracket
          data={swissData}
          title={hasDeBracket ? `Швейцарка — ${season.name}` : `Сетка — ${season.name}`}
          citySlug={citySlug}
        />
      )}

      {/* DE bracket (плей-офф) */}
      {hasDeBracket && (
        <TournamentBracket
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sections={transformSlotsToSections(slots as any)}
          title={swissData ? `Плей-офф — ${season.name}` : `Сетка — ${season.name}`}
        />
      )}
    </VStack>
  )
}
