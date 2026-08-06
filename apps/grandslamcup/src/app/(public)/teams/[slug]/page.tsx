/**
 * Профиль команды — описание, состав, календарь, статистика
 */

import { parseSocialLinks, SocialLinks } from '@/app/_components/social-links'
import { StatBlock } from '@/app/_components/stat-tooltip'
import { prisma } from '@/lib/db'
import { getRoleLabel } from '@/lib/player-role-labels'
import { Badge, Box, Flex, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { MatchCard } from '../../../_components/match-card'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const team = await prisma.team.findUnique({ where: { slug }, select: { name: true } })
  if (!team) {
    return { title: 'Команда не найдена' }
  }
  return {
    title: team.name,
    description: `${team.name} — команда Кубка Большого Слэма`,
    alternates: { canonical: `/teams/${slug}` },
    openGraph: { title: team.name, description: `Профиль команды ${team.name}`, siteName: 'Grand Slam Cup' },
  }
}

export default async function TeamPage({ params }: { params: Params }) {
  const { slug } = await params

  const team = await prisma.team.findUnique({
    where: { slug },
    include: {
      city: { select: { name: true } },
      homeVenue: { select: { name: true } },
      teamSeasons: {
        include: {
          league: { select: { name: true } },
          season: { select: { name: true, status: true } },
          playerTeamSeasons: {
            include: {
              player: { select: { name: true, slug: true } },
            },
            where: { leftAt: null },
          },
        },
        orderBy: { season: { startDate: 'desc' } },
      },
    },
  })

  if (!team) {
    notFound()
  }

  // Текущий сезон (активный или последний)
  const currentTs = team.teamSeasons.find((ts) => ts.season.status === 'ACTIVE') ?? team.teamSeasons[0]

  // Матчи команды
  const matches = currentTs
    ? await prisma.match.findMany({
      where: {
        OR: [{ homeTeamId: currentTs.id }, { awayTeamId: currentTs.id }],
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        homeTeam: { include: { team: { select: { name: true } } } },
        awayTeam: { include: { team: { select: { name: true } } } },
        venue: { select: { name: true } },
      },
    })
    : []

  // Статистика
  const finishedMatches = matches.filter((m) => m.status === 'FINISHED')
  let won = 0,
    drawn = 0,
    lost = 0,
    scored = 0,
    conceded = 0,
    points = 0

  for (const m of finishedMatches) {
    const isHome = m.homeTeamId === currentTs?.id
    scored += isHome ? m.homeScore : m.awayScore
    conceded += isHome ? m.awayScore : m.homeScore
    const myPoints = isHome ? (m.homePoints ?? 0) : (m.awayPoints ?? 0)
    points += myPoints
    if (myPoints === 1) {
      won++
    } else if (myPoints === 0.5) {
      drawn++
    } else {
      lost++
    }
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <VStack gap={2} align="start">
        <Heading as="h1" size="2xl">
          {team.name}
        </Heading>
        {team.city && <Text color="fg.muted">{team.city.name}</Text>}
        {team.homeVenue && (
          <Text fontSize="sm" color="fg.muted">
            Стадион: {team.homeVenue.name}
          </Text>
        )}
        <SocialLinks socialLinks={parseSocialLinks(team.socialLinks)} variant="full" />
        {team.description && <Text mt={2}>{team.description}</Text>}
      </VStack>

      {/* Статистика сезона */}
      {currentTs && finishedMatches.length > 0 && (
        <Box bg="bg.subtle" borderRadius="xl" p={4}>
          <Text fontWeight="bold" mb={2}>
            {currentTs.season.name} — {currentTs.league.name}
          </Text>
          <Flex gap={4} flexWrap="wrap">
            <StatBlock label="И" tooltip="Игры" value={finishedMatches.length} />
            <StatBlock label="В" tooltip="Победы" value={won} />
            <StatBlock label="Н" tooltip="Ничьи" value={drawn} />
            <StatBlock label="П" tooltip="Поражения" value={lost} />
            <StatBlock label="Заб" tooltip="Забитые баллы" value={scored} />
            <StatBlock label="Проп" tooltip="Пропущенные баллы" value={conceded} />
            <StatBlock label="Очки" tooltip="Турнирные очки" value={points} bold />
          </Flex>
        </Box>
      )}

      {/* Состав */}
      {currentTs && currentTs.playerTeamSeasons.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Состав
          </Heading>
          {/* Тренерский штаб */}
          {currentTs.playerTeamSeasons.filter((pts) => pts.role !== 'PLAYER').length > 0 && (
            <VStack align="start" gap={1} mb={3}>
              <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wide">
                Тренерский штаб
              </Text>
              {currentTs.playerTeamSeasons
                .filter((pts) =>
                  pts.role !== 'PLAYER'
                )
                .map((pts) => (
                  <Link key={pts.id} href={`/players/${pts.player.slug}`}>
                    <Flex align="center" gap={2} py={1} _hover={{ color: 'brand.solid' }}>
                      <Text fontSize="sm">{pts.player.name}</Text>
                      <Badge size="sm" colorPalette="teal">
                        {getRoleLabel(pts.role, pts.isPlaying)}
                      </Badge>
                    </Flex>
                  </Link>
                ))}
            </VStack>
          )}
          {/* Поэты: обычные игроки + играющие тренеры */}
          <VStack align="start" gap={1}>
            {currentTs.playerTeamSeasons
              .filter((pts) => pts.role === 'PLAYER' || pts.isPlaying === true)
              .map((pts) => (
                <Link key={pts.id} href={`/players/${pts.player.slug}`}>
                  <Flex align="center" gap={2} py={1} _hover={{ color: 'brand.solid' }}>
                    <Text fontSize="sm">{pts.player.name}</Text>
                    {pts.role !== 'PLAYER' && (
                      <Badge size="sm" colorPalette="teal">
                        {getRoleLabel(pts.role, pts.isPlaying)}
                      </Badge>
                    )}
                  </Flex>
                </Link>
              ))}
          </VStack>
        </Box>
      )}

      {/* Календарь матчей */}
      {matches.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Матчи
          </Heading>
          <VStack gap={2} align="stretch">
            {matches.map((m) => (
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
      )}
    </VStack>
  )
}
