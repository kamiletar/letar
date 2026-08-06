/**
 * Профиль команды — hero с логотипом, статистика, состав с фото, матчи.
 */

import { EditTeamButton } from '@/app/_components/edit-team-button'
import { MatchCard } from '@/app/_components/match-card'
import { SectionHeading } from '@/app/_components/section-heading'
import { parseSocialLinks, SocialLinks } from '@/app/_components/social-links'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { canEditTeam } from '@/lib/edit-permissions'
import { Badge, Box, Button, Circle, Flex, Grid, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { LuMapPin, LuTrophy, LuUserCog, LuUserRound, LuUsers } from 'react-icons/lu'

type Params = Promise<{ citySlug: string; slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug, slug } = await params
  const city = await getCityBySlug(citySlug)
  const team = await prisma.team.findUnique({ where: { slug }, select: { name: true } })
  if (!team || !city) {
    return { title: 'Команда не найдена' }
  }
  return {
    title: `${team.name} — ${city.name}`,
    description: `${team.name} — команда Кубка Большого Слэма в ${city.name}`,
    alternates: { canonical: `/${citySlug}/teams/${slug}` },
    openGraph: { title: team.name, description: `Профиль команды ${team.name}`, siteName: 'Grand Slam Cup' },
  }
}

import { getRoleLabel } from '@/lib/player-role-labels'
import { playerDisplayName } from '@/lib/player-utils'

export default async function TeamPage({ params }: { params: Params }) {
  const { citySlug, slug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const team = await prisma.team.findUnique({
    where: { slug, cityId: city.id },
    include: {
      city: { select: { name: true } },
      homeVenue: { select: { name: true, slug: true } },
      teamSeasons: {
        include: {
          league: { select: { name: true } },
          season: { select: { name: true, status: true } },
          playerTeamSeasons: {
            include: {
              player: { select: { name: true, disambiguation: true, slug: true, photo: true } },
            },
            where: { leftAt: null },
            orderBy: { joinedAt: 'asc' },
          },
        },
        orderBy: { season: { startDate: 'desc' } },
      },
    },
  })

  if (!team) {
    // Команда может существовать в другом городе — редирект на generic URL
    const existing = await prisma.team.findUnique({ where: { slug }, select: { city: { select: { slug: true } } } })
    if (existing) {
      redirect(`/${existing.city.slug}/teams/${slug}`)
    }
    notFound()
  }

  // Текущий сезон (активный или последний)
  const currentTs = team.teamSeasons.find((ts) => ts.season.status === 'ACTIVE') ?? team.teamSeasons[0]

  // Серверная проверка прав: admin или тренер этой команды
  const canEdit = await canEditTeam(team.teamSeasons.map((ts) => ts.id))

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

  // Карточки команды за текущий сезон
  const teamCards = currentTs
    ? await prisma.card.findMany({
      where: { teamSeasonId: currentTs.id },
      select: { type: true },
    })
    : []
  const yellowCards = teamCards.filter((c) => c.type === 'YELLOW').length
  const redCards = teamCards.filter((c) => c.type === 'RED').length

  // Разделяем состав: тренерский штаб и играющие поэты
  // Тренеры/замы всегда в штабе; играющие тренеры (isPlaying=true) также среди поэтов
  const coaches = currentTs?.playerTeamSeasons.filter((pts) => pts.role !== 'PLAYER') ?? []
  const players = currentTs?.playerTeamSeasons.filter((pts) => {
    if (pts.role === 'PLAYER') {
      return true
    }
    // Играющие тренеры показываются и среди поэтов
    return pts.isPlaying === true
  }) ?? []

  return (
    <VStack gap={8} align="stretch">
      {/* Hero-блок команды */}
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
        {/* Декоративный круг */}
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
          {/* Логотип команды */}
          <Box
            w={{ base: 20, md: 28 }}
            h={{ base: 20, md: 28 }}
            borderRadius="xl"
            overflow="hidden"
            flexShrink={0}
            borderWidth="2px"
            borderColor="whiteAlpha.200"
          >
            {team.logo
              ? (
                <Image
                  src={`/api/files/${team.logo}`}
                  alt={team.name}
                  width={112}
                  height={112}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                />
              )
              : (
                <Flex align="center" justify="center" h="full" bg="brand.800">
                  <LuUsers size={40} color="rgba(255,255,255,0.4)" />
                </Flex>
              )}
          </Box>

          {/* Информация */}
          <VStack gap={2} align="start" flex={1}>
            <Heading as="h1" size={{ base: 'xl', md: '2xl' }} color="white">
              {team.name}
            </Heading>
            {team.city && (
              <Text color="brand.200" fontSize="sm">
                {team.city.name}
              </Text>
            )}
            <HStack gap={3} flexWrap="wrap">
              {team.homeVenue && (
                <Link href={`/${citySlug}/venues/${team.homeVenue.slug}`}>
                  <HStack gap={1} color="whiteAlpha.600" fontSize="sm" _hover={{ color: 'white' }}>
                    <LuMapPin size={14} />
                    <Text>{team.homeVenue.name}</Text>
                  </HStack>
                </Link>
              )}
              {currentTs && (
                <Badge colorPalette="brand" variant="subtle" size="sm">
                  {currentTs.league.name}
                </Badge>
              )}
            </HStack>
            <HStack gap={2}>
              <SocialLinks socialLinks={parseSocialLinks(team.socialLinks)} variant="full" />
              <EditTeamButton
                teamId={team.id}
                teamName={team.name}
                description={team.description}
                logo={team.logo}
                socialLinks={parseSocialLinks(team.socialLinks)}
                canEdit={canEdit}
                citySlug={citySlug}
                teamSlug={slug}
              />
              {canEdit && (
                <Box asChild>
                  <Link href="/coach/roster">
                    <Button size="xs" variant="outline" colorPalette="brand">
                      <LuUserCog size={14} />
                      Управление составом
                    </Button>
                  </Link>
                </Box>
              )}
            </HStack>
          </VStack>
        </Flex>
      </Box>

      {/* Описание */}
      {team.description && (
        <Text color="fg.muted" fontSize="md">
          {team.description}
        </Text>
      )}

      {/* Статистика сезона */}
      {currentTs && finishedMatches.length > 0 && (
        <Box>
          <SectionHeading mb={4}>
            <HStack gap={2}>
              <LuTrophy size={18} />
              <Text>{currentTs.season.name}</Text>
            </HStack>
          </SectionHeading>
          <Box borderWidth="1px" borderColor="border" borderRadius="xl" overflow="hidden">
            <Grid templateColumns="repeat(7, 1fr)" gap={0}>
              {/* Заголовки */}
              {['И', 'В', 'Н', 'П', 'Заб', 'Проп', 'Очки'].map((h) => (
                <Box
                  key={h}
                  px={3}
                  py={2}
                  textAlign="center"
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
              {/* Значения */}
              {[finishedMatches.length, won, drawn, lost, scored, conceded, points].map((val, i) => {
                const isPoints = i === 6
                return (
                  <Box
                    key={i}
                    px={3}
                    py={3}
                    textAlign="center"
                    fontWeight={isPoints ? 'bold' : 'medium'}
                    fontSize={isPoints ? 'lg' : 'md'}
                    fontFamily={isPoints ? 'mono' : undefined}
                    color={isPoints ? 'brand.solid' : undefined}
                  >
                    {val}
                  </Box>
                )
              })}
            </Grid>
          </Box>
        </Box>
      )}

      {/* Карточки за сезон */}
      {(yellowCards > 0 || redCards > 0) && (
        <Flex gap={4} flexWrap="wrap" align="center">
          {yellowCards > 0 && (
            <Badge colorPalette="yellow" size="lg" variant="subtle">
              🟡 Жёлтых: {yellowCards}
            </Badge>
          )}
          {redCards > 0 && (
            <Badge colorPalette="red" size="lg" variant="subtle">
              🔴 Красных: {redCards}
            </Badge>
          )}
          {yellowCards >= 4 && (
            <Text fontSize="sm" color="red.500" fontWeight="semibold">
              Внимание: {5 - yellowCards === 0 ? 'дисквалификация!' : `до дисквалификации: ${5 - yellowCards} карточка`}
            </Text>
          )}
        </Flex>
      )}

      {/* Состав */}
      {currentTs && currentTs.playerTeamSeasons.length > 0 && (
        <Box>
          <SectionHeading mb={4}>Состав ({currentTs.playerTeamSeasons.length})</SectionHeading>

          {/* Тренерский штаб */}
          {coaches.length > 0 && (
            <Box mb={4}>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                color="fg.muted"
                textTransform="uppercase"
                letterSpacing="wide"
                mb={2}
              >
                Тренерский штаб
              </Text>
              <HStack gap={4} flexWrap="wrap">
                {coaches.map((pts) => (
                  <Link key={pts.id} href={`/${citySlug}/players/${pts.player.slug}`}>
                    <HStack
                      gap={3}
                      p={3}
                      borderRadius="xl"
                      borderWidth="1px"
                      borderColor="border"
                      bg="bg.panel"
                      _hover={{ shadow: 'md', borderColor: 'brand.solid' }}
                      transition="all 0.2s"
                    >
                      <Box w={10} h={10} borderRadius="lg" overflow="hidden" flexShrink={0} position="relative">
                        {pts.player.photo
                          ? (
                            <Image
                              src={`/api/files/${pts.player.photo}`}
                              alt={pts.player.name}
                              fill
                              sizes="40px"
                              style={{ objectFit: 'cover' }}
                            />
                          )
                          : (
                            <Circle size={10} bg="brand.subtle" color="brand.solid">
                              <LuUserRound size={20} />
                            </Circle>
                          )}
                      </Box>
                      <VStack gap={0} align="start">
                        <Text fontWeight="semibold" fontSize="sm">
                          {playerDisplayName(pts.player)}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          {getRoleLabel(pts.role, pts.isPlaying)}
                        </Text>
                      </VStack>
                    </HStack>
                  </Link>
                ))}
              </HStack>
            </Box>
          )}

          {/* Игроки — карточки с фото */}
          <SimpleGrid columns={{ base: 3, sm: 4, md: 5, lg: 6 }} gap={3}>
            {players.map((pts) => (
              <Link key={pts.id} href={`/${citySlug}/players/${pts.player.slug}`}>
                <Box
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor="border"
                  bg="bg.panel"
                  overflow="hidden"
                  _hover={{ shadow: 'md', borderColor: 'border.emphasized', transform: 'translateY(-2px)' }}
                  transition="all 0.2s ease"
                >
                  {/* Фото */}
                  <Box position="relative" w="full" pt="100%" bg="bg.subtle">
                    {pts.player.photo
                      ? (
                        <Image
                          src={`/api/files/${pts.player.photo}`}
                          alt={pts.player.name}
                          fill
                          sizes="(max-width: 640px) 33vw, 16vw"
                          style={{ objectFit: 'cover' }}
                        />
                      )
                      : (
                        <Flex
                          position="absolute"
                          inset={0}
                          align="center"
                          justify="center"
                          bg={{ base: 'gray.100', _dark: 'gray.800' }}
                        >
                          <Circle size={10} bg="brand.subtle" color="brand.solid">
                            <LuUserRound size={20} />
                          </Circle>
                        </Flex>
                      )}
                  </Box>
                  <Box px={2} py={2} textAlign="center">
                    <Text fontWeight="medium" fontSize="xs" lineClamp={1}>
                      {playerDisplayName(pts.player)}
                    </Text>
                  </Box>
                </Box>
              </Link>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Матчи */}
      {matches.length > 0 && (
        <Box>
          <SectionHeading mb={4}>Матчи</SectionHeading>
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
                citySlug={citySlug}
              />
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}
