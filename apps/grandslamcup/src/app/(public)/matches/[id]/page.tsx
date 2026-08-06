/**
 * Страница матча — статус, составы, результаты поэт-по-поэту, MVP
 */

import { DataTableWrapper } from '@/app/_components/data-table-wrapper'
import { PhotoGallery } from '@/app/_components/photo-gallery'
import { ScrollToTopOnMount } from '@/app/_components/scroll-to-top-on-mount'
import { prisma } from '@/lib/db'
import { formatDateTimeFull } from '@/lib/format-date'
import { getDisplayStatus, STATUS_MAP } from '@/lib/match-status'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import { findMatchMVP } from '@/lib/scoring'
import { Badge, Box, Flex, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Params = Promise<{ id: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      ...MATCH_TEAMS_NAME,
    },
  })
  if (!match) {
    return { title: 'Матч не найден' }
  }

  const home = match.homeTeam.team.name
  const away = match.awayTeam.team.name
  const description = match.status === 'FINISHED'
    ? `${home} ${match.homeScore} : ${match.awayScore} ${away} — результат матча`
    : `${home} vs ${away} — матч Кубка Большого Слэма`

  const ogImages = match.posterUrl ? [{ url: `/api/files/${match.posterUrl}`, alt: `${home} vs ${away}` }] : undefined

  return {
    title: `${home} vs ${away}`,
    description,
    alternates: { canonical: `/matches/${id}` },
    openGraph: {
      title: `${home} vs ${away}`,
      description,
      siteName: 'Grand Slam Cup',
      images: ogImages,
    },
  }
}

export default async function MatchPage({ params }: { params: Params }) {
  const { id } = await params

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: { include: { team: { select: { name: true, slug: true, city: { select: { slug: true } } } } } },
      awayTeam: { include: { team: { select: { name: true, slug: true, city: { select: { slug: true } } } } } },
      venue: { select: { name: true } },
      league: { select: { name: true } },
      tour: {
        include: {
          round: { include: { season: { select: { name: true } } } },
        },
      },
      performances: {
        include: {
          player: { select: { name: true, slug: true } },
          teamSeason: { select: { id: true } },
        },
        orderBy: [{ half: 'asc' }, { roundNumber: 'asc' }],
      },
      lineups: {
        include: {
          player: { select: { name: true, slug: true } },
          teamSeason: { select: { id: true } },
        },
      },
      photos: {
        orderBy: { order: 'asc' },
        select: { id: true, path: true, caption: true, width: true, height: true },
      },
    },
  })

  if (!match) {
    notFound()
  }

  const isFinished = match.status === 'FINISHED'
  const homeTeamName = match.homeTeam.team.name
  const awayTeamName = match.awayTeam.team.name

  // citySlug для ссылок на профили (берём из домашней команды)
  const citySlug = match.homeTeam.team.city?.slug

  /** Формирует href на профиль игрока */
  function playerHref(slug: string) {
    return citySlug ? `/${citySlug}/players/${slug}` : `/players/${slug}`
  }

  // MVP матча
  const mvp = isFinished
    ? findMatchMVP(
      match.performances.map((p) => ({
        playerName: p.player.name,
        playerSlug: p.player.slug,
        totalScore: p.totalScore,
      })),
    )
    : null

  // Группируем перформансы по таймам
  const half1 = match.performances.filter((p) => p.half === 1)
  const half2 = match.performances.filter((p) => p.half === 2)

  const displayStatus = getDisplayStatus(match)
  const statusInfo = STATUS_MAP[displayStatus] ?? { label: displayStatus, color: 'gray' }

  return (
    <VStack gap={6} align="stretch">
      <ScrollToTopOnMount />
      {/* Метаинформация */}
      <VStack gap={1} align="center">
        <Text fontSize="sm" color="fg.muted">
          {match.tour?.round.season.name ?? 'Товарищеский'} — {match.tour?.round.name ?? 'матч'}, Тур{' '}
          {match.tour?.number}
        </Text>
        {match.league && (
          <Badge colorPalette="blue" size="sm">
            {match.league.name}
          </Badge>
        )}
      </VStack>

      {/* Счёт */}
      <Box bg="bg.subtle" borderRadius="xl" p={6} textAlign="center">
        <Flex justify="center" align="center" gap={6}>
          <VStack gap={1} flex={1}>
            <Text fontSize="lg" fontWeight="bold">
              {homeTeamName}
            </Text>
          </VStack>
          {isFinished
            ? (
              <Text fontSize="4xl" fontWeight="bold" fontFamily="mono">
                {match.homeScore} : {match.awayScore}
              </Text>
            )
            : (
              <Text fontSize="2xl" color="fg.muted">
                vs
              </Text>
            )}
          <VStack gap={1} flex={1}>
            <Text fontSize="lg" fontWeight="bold">
              {awayTeamName}
            </Text>
          </VStack>
        </Flex>

        <Flex justify="center" align="center" gap={3} mt={3}>
          <Badge colorPalette={statusInfo.color}>{statusInfo.label}</Badge>
          {match.scheduledAt && (
            <Text fontSize="sm" color="fg.muted">
              {formatDateTimeFull(match.scheduledAt)}
            </Text>
          )}
        </Flex>

        {match.venue && (
          <Text fontSize="sm" color="fg.muted" mt={2}>
            {match.venue.name}
          </Text>
        )}
      </Box>

      {/* MVP */}
      {mvp && (
        <Box bg="yellow.subtle" borderRadius="xl" p={4} textAlign="center">
          <Text fontSize="sm" color="fg.muted" mb={1}>
            MVP матча
          </Text>
          <Link href={playerHref(mvp.playerSlug)}>
            <Text fontSize="xl" fontWeight="bold" _hover={{ color: 'brand.solid' }}>
              {mvp.playerName}
            </Text>
          </Link>
          <Text fontSize="lg" color="brand.solid">
            {mvp.totalScore} баллов
          </Text>
        </Box>
      )}

      {/* Результаты по таймам */}
      {isFinished && match.performances.length > 0 && (
        <>
          {[
            { label: '1 тайм', perfs: half1 },
            { label: '2 тайм', perfs: half2 },
          ]
            .filter(({ perfs }) => perfs.length > 0)
            .map(({ label, perfs }) => (
              <Box key={label}>
                <Heading size="md" mb={3}>
                  {label}
                </Heading>
                <DataTableWrapper>
                  <Grid templateColumns="40px 1fr 60px 60px 60px" gap={0} fontSize="sm" minW="400px">
                    {['#', 'Поэт', 'Текст', 'Подача', 'Итого'].map((h) => (
                      <Box key={h} px={3} py={2} fontWeight="bold" bg="bg.subtle" borderBottomWidth="1px">
                        {h}
                      </Box>
                    ))}
                    {perfs.map((p, i) => {
                      const isHome = p.teamSeason.id === match.homeTeamId
                      return (
                        <>
                          <Box key={`n-${p.id}`} px={3} py={2} borderBottomWidth="1px">
                            {i + 1}
                          </Box>
                          <Box key={`name-${p.id}`} px={3} py={2} borderBottomWidth="1px">
                            <Text>
                              <Link href={playerHref(p.player.slug)}>
                                <Text as="span" _hover={{ color: 'brand.solid' }}>
                                  {p.player.name}
                                </Text>
                              </Link>
                              <Text as="span" fontSize="xs" color="fg.muted" ml={1}>
                                ({isHome ? homeTeamName : awayTeamName})
                              </Text>
                            </Text>
                          </Box>
                          <Box key={`t-${p.id}`} px={3} py={2} borderBottomWidth="1px" textAlign="center">
                            {p.textAdjusted ?? '—'}
                          </Box>
                          <Box key={`d-${p.id}`} px={3} py={2} borderBottomWidth="1px" textAlign="center">
                            {p.deliveryAdjusted ?? '—'}
                          </Box>
                          <Box
                            key={`s-${p.id}`}
                            px={3}
                            py={2}
                            borderBottomWidth="1px"
                            textAlign="center"
                            fontWeight="bold"
                          >
                            {p.totalScore ?? '—'}
                          </Box>
                        </>
                      )
                    })}
                  </Grid>
                </DataTableWrapper>
              </Box>
            ))}
        </>
      )}

      {/* Составы */}
      {match.lineups.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Составы
          </Heading>
          <Flex gap={6} direction={{ base: 'column', md: 'row' }}>
            {[
              { name: homeTeamName, teamId: match.homeTeamId },
              { name: awayTeamName, teamId: match.awayTeamId },
            ].map(({ name, teamId }) => (
              <Box key={teamId} flex={1}>
                <Text fontWeight="bold" mb={2}>
                  {name}
                </Text>
                <VStack align="start" gap={1}>
                  {match.lineups
                    .filter((l) => l.teamSeason.id === teamId)
                    .map((l) => (
                      <Text key={l.id} fontSize="sm">
                        <Link href={playerHref(l.player.slug)}>
                          <Text as="span" _hover={{ color: 'brand.solid' }}>
                            {l.player.name}
                          </Text>
                        </Link>
                        {l.status !== 'STARTER_HALF1' && (
                          <Badge ml={1} size="sm" colorPalette="gray">
                            {l.status}
                          </Badge>
                        )}
                      </Text>
                    ))}
                </VStack>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {/* Фотографии матча */}
      {match.photos.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Фото ({match.photos.length})
          </Heading>
          <PhotoGallery photos={match.photos} />
        </Box>
      )}
    </VStack>
  )
}
