/**
 * Страница матча — hero со счётом, составы двумя колонками, результаты по таймам, MVP, фото.
 */

import { EditMatchButton } from '@/app/_components/edit-match-button'
import { ScrollToTopOnMount } from '@/app/_components/scroll-to-top-on-mount'
import { getSession } from '@/lib/auth'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { isOrganizerOfCity } from '@/lib/edit-permissions'
import { formatDateTimeFull } from '@/lib/format-date'
import { getDisplayStatus, STATUS_MAP } from '@/lib/match-status'
import { findMatchMVP } from '@/lib/scoring'
import { Badge, Box, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuCalendarDays, LuMapPin } from 'react-icons/lu'

import { JudgeAnalytics } from './_components/judge-analytics'
import { MatchHalfResults } from './_components/match-half-results'
import { MatchLineups } from './_components/match-lineups'
import { MatchMvpCard } from './_components/match-mvp-card'
import { MatchPhotoSection } from './_components/match-photo-section'
import { TelegramOrganizerButtons } from './_components/telegram-organizer-buttons'

type Params = Promise<{ citySlug: string; id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug, id } = await params
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { include: { team: { select: { name: true } } } },
      awayTeam: { include: { team: { select: { name: true } } } },
    },
  })
  if (!match) {
    return { title: 'Матч не найден' }
  }

  const home = match.homeTeam.team.name
  const away = match.awayTeam.team.name
  const description =
    match.status === 'FINISHED'
      ? `${home} ${match.homeScore} : ${match.awayScore} ${away} — результат матча`
      : `${home} vs ${away} — матч Кубка Большого Слэма`

  const ogImages = match.posterUrl ? [{ url: `/api/files/${match.posterUrl}`, alt: `${home} vs ${away}` }] : undefined

  return {
    title: `${home} vs ${away}`,
    description,
    alternates: { canonical: `/${citySlug}/matches/${id}` },
    openGraph: { title: `${home} vs ${away}`, description, siteName: 'Grand Slam Cup', images: ogImages },
  }
}

export default async function MatchPage({ params }: { params: Params }) {
  const { citySlug, id } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: {
        include: {
          team: { select: { name: true, slug: true, logo: true } },
          playerTeamSeasons: { where: { leftAt: null }, select: { player: { select: { userId: true } } } },
        },
      },
      awayTeam: {
        include: {
          team: { select: { name: true, slug: true, logo: true } },
          playerTeamSeasons: { where: { leftAt: null }, select: { player: { select: { userId: true } } } },
        },
      },
      venue: { select: { name: true, slug: true } },
      league: { select: { name: true } },
      tour: {
        include: {
          round: { include: { season: { select: { name: true } } } },
        },
      },
      performances: {
        include: {
          player: { select: { name: true, slug: true, photo: true, disambiguation: true } },
          teamSeason: { select: { id: true } },
        },
        orderBy: [{ half: 'asc' }, { roundNumber: 'asc' }],
      },
      lineups: {
        include: {
          player: { select: { name: true, slug: true, photo: true, disambiguation: true } },
          teamSeason: { select: { id: true } },
        },
      },
      photos: {
        orderBy: { order: 'asc' },
        select: { id: true, path: true, caption: true, width: true, height: true, uploadedById: true },
      },
    },
  })

  if (!match) {
    notFound()
  }

  // Текущая сессия для проверки прав
  const session = await getSession()
  const currentUserId = session?.user?.id ?? null

  // Проверка прав на редактирование постера и публикацию в Telegram
  const canEditMatch = await isOrganizerOfCity(city.id)

  // teamSeasonId тренера (если авторизован как тренер одной из команд матча)
  let coachTeamSeasonId: string | null = null
  if (currentUserId) {
    const pts = await prisma.playerTeamSeason.findFirst({
      where: {
        player: { userId: currentUserId },
        role: { in: ['COACH', 'ASSISTANT_COACH'] },
        teamSeasonId: { in: [match.homeTeamId, match.awayTeamId] },
        leftAt: null,
      },
      select: { teamSeasonId: true },
    })
    coachTeamSeasonId = pts?.teamSeasonId ?? null
  }

  // Составы скрываем до -6ч до матча (за исключением тренера своей команды)
  const isScheduled = match.status === 'SCHEDULED'
  const hoursUntilMatch = match.scheduledAt ? (match.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60) : null
  const lineupsLocked = isScheduled && hoursUntilMatch !== null && hoursUntilMatch > 6

  type LineupItem = (typeof match)['lineups'][number]
  function filterLineup(lineup: LineupItem[], teamSeasonId: string) {
    if (!lineupsLocked) return lineup
    // Тренер видит состав только своей команды
    if (coachTeamSeasonId === teamSeasonId) return lineup
    // Организаторы/адмиmы видят всё
    if (canEditMatch) return lineup
    // Все остальные — пусто до -6ч
    return []
  }

  // Может ли текущий пользователь загружать фото (участник команды)
  const canUploadPhoto = currentUserId
    ? match.homeTeam.playerTeamSeasons?.some(
        (pts: { player: { userId: string | null } }) => pts.player.userId === currentUserId
      ) ||
      match.awayTeam.playerTeamSeasons?.some(
        (pts: { player: { userId: string | null } }) => pts.player.userId === currentUserId
      ) ||
      canEditMatch
    : false

  const isFinished = match.status === 'FINISHED'
  const isLive = match.status === 'LIVE'
  const homeTeam = match.homeTeam.team
  const awayTeam = match.awayTeam.team
  const displayStatus = getDisplayStatus(match)
  const statusInfo = STATUS_MAP[displayStatus] ?? { label: displayStatus, color: 'gray' }

  const homeWins = isFinished && match.homeScore > match.awayScore
  const awayWins = isFinished && match.awayScore > match.homeScore

  const mvp = isFinished
    ? findMatchMVP(
        match.performances.map((p) => ({
          playerName: p.player.name,
          playerSlug: p.player.slug,
          totalScore: p.totalScore,
        }))
      )
    : null

  const half1 = match.performances.filter((p) => p.half === 1)
  const half2 = match.performances.filter((p) => p.half === 2)
  const homeLineupRaw = match.lineups.filter((l) => l.teamSeason.id === match.homeTeamId)
  const awayLineupRaw = match.lineups.filter((l) => l.teamSeason.id === match.awayTeamId)
  const homeLineup = filterLineup(homeLineupRaw, match.homeTeamId)
  const awayLineup = filterLineup(awayLineupRaw, match.awayTeamId)
  const homeLineupHidden = lineupsLocked && homeLineupRaw.length > 0 && homeLineup.length === 0
  const awayLineupHidden = lineupsLocked && awayLineupRaw.length > 0 && awayLineup.length === 0

  return (
    <VStack gap={8} align="stretch">
      <ScrollToTopOnMount />
      {/* Постер матча */}
      {match.posterUrl && (
        <Box maxW="lg" mx="auto">
          <Image
            src={`/api/files/${match.posterUrl}`}
            alt={`Постер: ${homeTeam.name} vs ${awayTeam.name}`}
            width={600}
            height={800}
            style={{ width: '100%', height: 'auto', borderRadius: '12px' }}
          />
        </Box>
      )}

      {/* Hero — счёт матча */}
      <Box
        bg="brand.950"
        bgGradient="to-br"
        gradientFrom="brand.950"
        gradientTo="brand.900"
        borderRadius="2xl"
        px={{ base: 4, md: 8 }}
        py={{ base: 6, md: 10 }}
        position="relative"
        overflow="hidden"
      >
        {/* Кнопки для организаторов */}
        <Box position="absolute" top={3} right={3} zIndex={2} display="flex" gap={2} alignItems="center">
          <TelegramOrganizerButtons matchId={match.id} isFinished={isFinished} canPublish={canEditMatch} />
          <EditMatchButton matchId={match.id} posterUrl={match.posterUrl} canEdit={canEditMatch} />
        </Box>

        {/* Декоративные круги */}
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
        <Box
          position="absolute"
          bottom="-40px"
          left="-40px"
          w="150px"
          h="150px"
          borderRadius="full"
          bg="accent.700"
          opacity={0.1}
          filter="blur(30px)"
          pointerEvents="none"
        />

        {/* Мета: сезон, тур */}
        <VStack gap={1} mb={6} position="relative">
          {match.tour ? (
            <Text fontSize="xs" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wide">
              {match.tour.round.season.name} — {match.tour.round.name}, Тур {match.tour.number}
            </Text>
          ) : (
            <Text fontSize="xs" color="whiteAlpha.500" textTransform="uppercase" letterSpacing="wide">
              Товарищеский матч
            </Text>
          )}
          {match.league && (
            <Badge colorPalette="brand" variant="subtle" size="sm">
              {match.league.name}
            </Badge>
          )}
        </VStack>

        {/* Счёт: Команда — Score — Команда */}
        <Flex justify="center" align="center" gap={{ base: 4, md: 8 }} position="relative">
          {/* Домашняя команда */}
          <VStack gap={2} flex={1} align="center">
            <Link href={`/${citySlug}/teams/${homeTeam.slug}`}>
              <Box w={{ base: 12, md: 16 }} h={{ base: 12, md: 16 }} borderRadius="xl" overflow="hidden">
                {homeTeam.logo ? (
                  <Image
                    src={`/api/files/${homeTeam.logo}`}
                    alt={homeTeam.name}
                    width={64}
                    height={64}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                ) : (
                  <Flex align="center" justify="center" h="full" bg="brand.800" borderRadius="xl">
                    <Text color="whiteAlpha.400" fontWeight="bold" fontSize={{ base: 'lg', md: 'xl' }}>
                      {homeTeam.name.charAt(0)}
                    </Text>
                  </Flex>
                )}
              </Box>
            </Link>
            <Link href={`/${citySlug}/teams/${homeTeam.slug}`}>
              <Heading
                size={{ base: 'md', md: 'xl' }}
                color={homeWins ? 'white' : isFinished ? 'whiteAlpha.600' : 'white'}
                textAlign="center"
                _hover={{ color: 'brand.300' }}
                transition="color 0.15s"
              >
                {homeTeam.name}
              </Heading>
            </Link>
          </VStack>

          {/* Счёт */}
          {isFinished || isLive ? (
            <Text
              fontSize={{ base: '4xl', md: '6xl' }}
              fontWeight="bold"
              fontFamily="mono"
              color={isLive ? 'brand.400' : 'white'}
              letterSpacing="wider"
              flexShrink={0}
              className={isLive ? 'live-pulse' : undefined}
            >
              {match.homeScore}
              <Text display="inline" color="whiteAlpha.400" mx={{ base: 1, md: 2 }}>
                :
              </Text>
              {match.awayScore}
            </Text>
          ) : (
            <Text fontSize={{ base: '2xl', md: '4xl' }} color="whiteAlpha.400" fontWeight="medium" flexShrink={0}>
              vs
            </Text>
          )}

          {/* Гостевая команда */}
          <VStack gap={2} flex={1} align="center">
            <Link href={`/${citySlug}/teams/${awayTeam.slug}`}>
              <Box w={{ base: 12, md: 16 }} h={{ base: 12, md: 16 }} borderRadius="xl" overflow="hidden">
                {awayTeam.logo ? (
                  <Image
                    src={`/api/files/${awayTeam.logo}`}
                    alt={awayTeam.name}
                    width={64}
                    height={64}
                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  />
                ) : (
                  <Flex align="center" justify="center" h="full" bg="brand.800" borderRadius="xl">
                    <Text color="whiteAlpha.400" fontWeight="bold" fontSize={{ base: 'lg', md: 'xl' }}>
                      {awayTeam.name.charAt(0)}
                    </Text>
                  </Flex>
                )}
              </Box>
            </Link>
            <Link href={`/${citySlug}/teams/${awayTeam.slug}`}>
              <Heading
                size={{ base: 'md', md: 'xl' }}
                color={awayWins ? 'white' : isFinished ? 'whiteAlpha.600' : 'white'}
                textAlign="center"
                _hover={{ color: 'brand.300' }}
                transition="color 0.15s"
              >
                {awayTeam.name}
              </Heading>
            </Link>
          </VStack>
        </Flex>

        {/* Статус + дата + venue */}
        <VStack gap={1} mt={6} position="relative">
          <HStack gap={3}>
            <Badge colorPalette={statusInfo.color} className={isLive ? 'live-pulse' : undefined}>
              {isLive && '● '}
              {statusInfo.label}
            </Badge>
            {match.scheduledAt && (
              <HStack gap={1} color="whiteAlpha.500" fontSize="sm">
                <LuCalendarDays size={14} />
                <Text>{formatDateTimeFull(match.scheduledAt)}</Text>
              </HStack>
            )}
          </HStack>
          {match.venue && (
            <Link href={`/${citySlug}/venues/${match.venue.slug}`}>
              <HStack
                gap={2}
                color="whiteAlpha.600"
                fontSize={{ base: 'md', md: 'lg' }}
                _hover={{ color: 'white' }}
                transition="color 0.15s"
              >
                <LuMapPin size={14} />
                <Text>{match.venue.name}</Text>
              </HStack>
            </Link>
          )}
        </VStack>
      </Box>

      {/* Составы */}
      <MatchLineups
        homeLineup={homeLineup}
        awayLineup={awayLineup}
        homeTeamName={homeTeam.name}
        awayTeamName={awayTeam.name}
        homeWins={homeWins}
        awayWins={awayWins}
        citySlug={citySlug}
        homeLineupHidden={homeLineupHidden}
        awayLineupHidden={awayLineupHidden}
      />

      {/* MVP */}
      {mvp && <MatchMvpCard mvp={mvp} citySlug={citySlug} />}

      {/* Результаты по таймам */}
      {isFinished && match.performances.length > 0 && (
        <>
          {half1.length > 0 && (
            <MatchHalfResults
              label="1 тайм"
              perfs={half1}
              homeTeamId={match.homeTeamId}
              homeTeamName={homeTeam.name}
              awayTeamName={awayTeam.name}
              citySlug={citySlug}
            />
          )}
          {half2.length > 0 && (
            <MatchHalfResults
              label="2 тайм"
              perfs={half2}
              homeTeamId={match.homeTeamId}
              homeTeamName={homeTeam.name}
              awayTeamName={awayTeam.name}
              citySlug={citySlug}
            />
          )}
        </>
      )}

      {/* Аналитика судейства (только для завершённых матчей) */}
      {match.status === 'FINISHED' && <JudgeAnalytics matchId={match.id} />}

      {/* Фотографии */}
      {(match.photos.length > 0 || canUploadPhoto) && (
        <MatchPhotoSection
          matchId={match.id}
          citySlug={citySlug}
          photos={match.photos}
          canUpload={canUploadPhoto}
          canDeleteAll={canEditMatch}
          currentUserId={currentUserId}
        />
      )}
    </VStack>
  )
}
