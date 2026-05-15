/**
 * Профиль поэта — hero с фото, статистика, лучшие выступления, timeline команд.
 */

import { ClaimProfileButton } from '@/app/_components/claim-profile-button'
import { EditPlayerButton } from '@/app/_components/edit-player-button'
import { parseSocialLinks, SocialLinks } from '@/app/_components/social-links'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { canEditPlayer } from '@/lib/edit-permissions'
import { playerDisplayName } from '@/lib/player-utils'
import { Badge, Box, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuUserRound } from 'react-icons/lu'

import { PlayerAllPerformances } from './_components/player-all-performances'
import { PlayerCareerTimeline } from './_components/player-career-timeline'
import { PlayerOpponentHistory } from './_components/player-opponent-history'
import { PlayerPoemsList } from './_components/player-poems-list'
import { PlayerRatingChart } from './_components/player-rating-chart'
import { PlayerStatsGrid } from './_components/player-stats-grid'
import { PlayerTopPerformances } from './_components/player-top-performances'
import { computePlayerStats } from './_lib/compute-player-stats'

type Params = Promise<{ citySlug: string; slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug, slug } = await params
  const city = await getCityBySlug(citySlug)
  const player = await prisma.player.findUnique({ where: { slug }, select: { name: true } })
  if (!player || !city) {
    return { title: 'Поэт не найден' }
  }
  return {
    title: `${player.name} — ${city.name}`,
    description: `${player.name} — поэт Кубка Большого Слэма в ${city.name}`,
    alternates: { canonical: `/${citySlug}/players/${slug}` },
    openGraph: { title: player.name, description: `Профиль поэта ${player.name}`, siteName: 'Grand Slam Cup' },
  }
}

export default async function PlayerPage({ params }: { params: Params }) {
  const { citySlug, slug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const player = await prisma.player.findUnique({
    where: { slug },
    include: {
      city: { select: { id: true, name: true, slug: true } },
      playerTeamSeasons: {
        include: {
          teamSeason: {
            include: {
              team: { select: { name: true, slug: true } },
              season: { select: { id: true, name: true } },
              league: { select: { name: true } },
            },
          },
        },
        orderBy: { teamSeason: { season: { startDate: 'desc' } } },
      },
      performances: {
        include: {
          match: {
            select: {
              id: true,
              scheduledAt: true,
              homeTeam: { include: { team: { select: { name: true } } } },
              awayTeam: { include: { team: { select: { name: true } } } },
            },
          },
          teamSeason: { select: { seasonId: true } },
          cards: { select: { type: true } },
        },
        where: { totalScore: { not: null } },
        orderBy: { match: { scheduledAt: 'desc' } },
      },
      poems: {
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, slug: true },
      },
    },
  })

  if (!player) {
    notFound()
  }

  // Редирект на правильный город если не совпадает
  if (player.city && player.city.id !== city.id) {
    redirect(`/${player.city.slug}/players/${slug}`)
  }

  // Проверка активного отстранения
  const activeSuspension = await prisma.playerSuspension.findFirst({
    where: { playerId: player.id, active: true },
    select: { id: true, matchesLeft: true },
  })

  // Серверная проверка прав
  const canEdit = await canEditPlayer(
    player.userId,
    player.playerTeamSeasons.map((pts) => pts.teamSeasonId)
  )

  const currentTeam = player.playerTeamSeasons[0]
  const currentSeasonId = currentTeam?.teamSeason.season.id
  const stats = await computePlayerStats(player.performances, currentSeasonId, player.id)

  return (
    <VStack gap={8} align="stretch">
      {/* Hero-блок */}
      <Box
        bg="brand.950"
        bgGradient="to-br"
        gradientFrom="brand.950"
        gradientTo="brand.900"
        borderRadius="2xl"
        px={{ base: 6, md: 10 }}
        py={{ base: 8, md: 10 }}
        position="relative"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top="-60px"
          right="-60px"
          w="200px"
          h="200px"
          borderRadius="full"
          bg="brand.700"
          opacity={0.2}
          filter="blur(40px)"
          pointerEvents="none"
        />

        <Flex gap={{ base: 5, md: 8 }} align="center" position="relative">
          {/* Фото */}
          <Box
            w={{ base: 24, md: 32 }}
            h={{ base: 24, md: 32 }}
            borderRadius="2xl"
            overflow="hidden"
            flexShrink={0}
            borderWidth="2px"
            borderColor="whiteAlpha.200"
          >
            {player.photo ? (
              <Image
                src={player.photo.startsWith('http') ? player.photo : `/api/files/${player.photo}`}
                alt={player.name}
                width={128}
                height={128}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              />
            ) : (
              <Flex align="center" justify="center" h="full" bg="brand.800">
                <LuUserRound size={48} color="rgba(255,255,255,0.3)" />
              </Flex>
            )}
          </Box>

          {/* Информация */}
          <VStack gap={2} align="start" flex={1}>
            <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color="white">
              {playerDisplayName(player)}
            </Heading>
            {player.city && (
              <Text color="brand.200" fontSize="sm">
                {player.city.name}
              </Text>
            )}
            <HStack gap={2} flexWrap="wrap">
              {currentTeam && (
                <Link href={`/${citySlug}/teams/${currentTeam.teamSeason.team.slug}`}>
                  <Badge colorPalette="brand" variant="subtle" size="lg" _hover={{ opacity: 0.8 }}>
                    {currentTeam.teamSeason.team.name}
                  </Badge>
                </Link>
              )}
              {player.badges.map((badge) => (
                <Badge key={badge} colorPalette="yellow" variant="subtle" size="lg">
                  {badge}
                </Badge>
              ))}
              {stats.isDebut && (
                <Badge colorPalette="green" variant="subtle" size="lg">
                  Дебют
                </Badge>
              )}
              {activeSuspension && (
                <Badge colorPalette="red" variant="solid" size="lg">
                  Отстранён ({activeSuspension.matchesLeft}{' '}
                  {activeSuspension.matchesLeft === 1 ? 'матч' : activeSuspension.matchesLeft < 5 ? 'матча' : 'матчей'})
                </Badge>
              )}
              {(stats.yellowCards > 0 || stats.redCards > 0) && (
                <Badge colorPalette="orange" variant="subtle" size="lg">
                  {stats.yellowCards > 0 && `🟡 ${stats.yellowCards}`}
                  {stats.yellowCards > 0 && stats.redCards > 0 && '  '}
                  {stats.redCards > 0 && `🔴 ${stats.redCards}`}
                </Badge>
              )}
            </HStack>
            <HStack gap={2}>
              <SocialLinks socialLinks={parseSocialLinks(player.socialLinks)} variant="full" />
              <EditPlayerButton
                playerId={player.id}
                playerName={player.name}
                playerUserId={player.userId}
                playerPhoto={player.photo}
                bio={player.bio}
                socialLinks={parseSocialLinks(player.socialLinks)}
                currentTeamId={currentTeam?.teamSeason.team.slug ?? null}
                canEdit={canEdit}
              />
              <ClaimProfileButton playerId={player.id} playerName={player.name} playerUserId={player.userId} />
            </HStack>
          </VStack>
        </Flex>
      </Box>

      {/* Био */}
      {player.bio && (
        <Text color="fg.muted" fontSize="md" whiteSpace="pre-wrap">
          {player.bio}
        </Text>
      )}

      {/* Статистика */}
      <PlayerStatsGrid stats={stats} />

      {/* График динамики баллов */}
      <PlayerRatingChart perfs={player.performances} />

      {/* Лучшие выступления */}
      <PlayerTopPerformances perfs={player.performances} citySlug={citySlug} />

      {/* История соперников */}
      <PlayerOpponentHistory perfs={player.performances} playerId={player.id} />

      {/* Все выступления */}
      <PlayerAllPerformances perfs={player.performances} citySlug={citySlug} />

      {/* Стихи */}
      <PlayerPoemsList poems={player.poems} citySlug={citySlug} playerSlug={slug} />

      {/* Карьера */}
      <PlayerCareerTimeline teamSeasons={player.playerTeamSeasons} citySlug={citySlug} />
    </VStack>
  )
}
