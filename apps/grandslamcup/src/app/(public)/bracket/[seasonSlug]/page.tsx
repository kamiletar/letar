/**
 * Публичная турнирная сетка — Swiss bracket + Double Elimination (без города).
 *
 * Редирект со старого URL. Автоматический выбор Swiss vs DE.
 */

import { TournamentBracket, transformSlotsToSections } from '@/app/_components/bracket'
import { SwissBracket } from '@/app/_components/swiss-bracket'
import { prisma } from '@/lib/db'
import { buildSwissBracket, type SwissMatchRow } from '@/lib/swiss-bracket'
import { Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Params = Promise<{ seasonSlug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { seasonSlug } = await params
  const season = await prisma.season.findUnique({
    where: { slug: seasonSlug },
    select: { name: true },
  })
  return {
    title: season ? `Сетка — ${season.name}` : 'Сетка не найдена',
    alternates: { canonical: `/bracket/${seasonSlug}` },
  }
}

export default async function PublicBracketPage({ params }: { params: Params }) {
  const { seasonSlug } = await params

  const season = await prisma.season.findUnique({
    where: { slug: seasonSlug },
    select: { id: true, name: true, format: true },
  })

  if (!season) {
    notFound()
  }

  // Загружаем BracketSlot (DE)
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

  // Swiss bracket
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
      {swissData && swissData.rounds.length > 0 && (
        <SwissBracket data={swissData} title={hasDeBracket ? `Швейцарка — ${season.name}` : `Сетка — ${season.name}`} />
      )}

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
