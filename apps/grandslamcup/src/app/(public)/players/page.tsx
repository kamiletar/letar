/**
 * Список поэтов (глобальный) — карточки с фото, именем и командой.
 * При наличии performances — рейтинговая таблица сверху.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { prisma } from '@/lib/db'
import { Box, Circle, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { LuUserRound } from 'react-icons/lu'

import { PlayerRatingTable, type PlayerStat } from '@/app/_components/player-rating-table'

import { PlayerFilters } from './_components/player-filters'

export const metadata: Metadata = {
  title: 'Поэты',
  description: 'Рейтинг поэтов Кубка Большого Слэма',
  alternates: { canonical: '/players' },
}

/** Минимум выступлений для попадания в рейтинг */
const MIN_PERFORMANCES = 3

type SearchParams = Promise<{ season?: string; city?: string; team?: string }>

export default async function PlayersPage({ searchParams }: { searchParams: SearchParams }) {
  const { season: seasonId, city: cityId, team: teamSlug } = await searchParams

  // Загружаем справочники для фильтров
  const [seasons, cities, teams] = await Promise.all([
    prisma.season.findMany({ orderBy: { startDate: 'desc' }, select: { id: true, name: true } }),
    prisma.city.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.team.findMany({ orderBy: { name: 'asc' }, select: { slug: true, name: true } }),
  ])

  // Формируем фильтры
  const performanceWhere: Record<string, unknown> = { totalScore: { not: null } }
  if (seasonId) {
    performanceWhere.match = { tour: { round: { seasonId } } }
  }

  // Неиграющие тренеры (isPlaying=false) не показываются в общем списке поэтов
  const playerWhere: Record<string, unknown> = {
    playerTeamSeasons: {
      some: { leftAt: null, isPlaying: true },
    },
  }
  if (cityId) {
    playerWhere.cityId = cityId
  }
  if (teamSlug) {
    playerWhere.playerTeamSeasons = {
      some: { teamSeason: { team: { slug: teamSlug } }, leftAt: null, isPlaying: true },
    }
  }

  const players = await prisma.player.findMany({
    where: playerWhere,
    orderBy: { name: 'asc' },
    include: {
      performances: {
        where: performanceWhere,
        select: { totalScore: true, textAdjusted: true, deliveryAdjusted: true },
      },
      playerTeamSeasons: {
        include: {
          teamSeason: { include: { team: { select: { name: true } } } },
        },
        where: { leftAt: null },
        take: 1,
        orderBy: { teamSeason: { season: { startDate: 'desc' } } },
      },
    },
  })

  // Рейтинговая таблица
  const playerStats: PlayerStat[] = players
    .flatMap((p) => {
      const perfs = p.performances.filter((perf) => perf.totalScore !== null)
      const count = perfs.length
      if (count < MIN_PERFORMANCES) {
        return []
      }

      const totalScore = perfs.reduce((sum, perf) => sum + perf.totalScore!, 0)
      const totalText = perfs.reduce((sum, perf) => sum + (perf.textAdjusted ?? 0), 0)
      const totalDelivery = perfs.reduce((sum, perf) => sum + (perf.deliveryAdjusted ?? 0), 0)
      const bestScore = Math.max(...perfs.map((perf) => perf.totalScore!))

      return [
        {
          name: p.name,
          slug: p.slug,
          currentTeam: p.playerTeamSeasons[0]?.teamSeason.team.name ?? null,
          matchesPlayed: count,
          avgScore: Math.round((totalScore / count) * 10) / 10,
          avgText: Math.round((totalText / count) * 10) / 10,
          avgDelivery: Math.round((totalDelivery / count) * 10) / 10,
          bestScore,
          totalScore,
          socialLinks: p.socialLinks as PlayerStat['socialLinks'],
        },
      ]
    })
    .sort((a, b) => b.avgScore - a.avgScore)

  const hasRating = playerStats.length > 0

  return (
    <VStack gap={8} align="stretch">
      <Flex justify="space-between" align="center">
        <SectionHeading>Поэты</SectionHeading>
        <Text fontSize="sm" color="fg.muted">
          {players.length} поэтов
        </Text>
      </Flex>

      {/* Фильтры */}
      <Suspense>
        <PlayerFilters
          seasons={seasons.map((s) => ({ value: s.id, label: s.name }))}
          cities={cities.map((c) => ({ value: c.id, label: c.name }))}
          teams={teams.map((t) => ({ value: t.slug, label: t.name }))}
          currentSeason={seasonId}
          currentCity={cityId}
          currentTeam={teamSlug}
        />
      </Suspense>

      {/* Рейтинговая таблица (если есть performances) */}
      {hasRating && (
        <>
          <SectionHeading size="md">Рейтинг</SectionHeading>
          <PlayerRatingTable players={playerStats} />
        </>
      )}

      {/* Все поэты — карточки */}
      {players.length > 0 && (
        <Box>
          {hasRating && (
            <SectionHeading size="md" mb={4}>
              Все поэты
            </SectionHeading>
          )}
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4, lg: 5 }} gap={3}>
            {players.map((p) => {
              const teamName = p.playerTeamSeasons[0]?.teamSeason.team.name ?? null
              return (
                <Link key={p.id} href={`/players/${p.slug}`}>
                  <Box
                    borderRadius="xl"
                    borderWidth="1px"
                    borderColor="border"
                    bg="bg.panel"
                    overflow="hidden"
                    _hover={{
                      shadow: 'lg',
                      borderColor: 'border.emphasized',
                      transform: 'translateY(-2px)',
                    }}
                    transition="all 0.2s ease"
                    h="full"
                  >
                    {/* Фото или плейсхолдер */}
                    <Box position="relative" w="full" pt="100%" bg="bg.subtle">
                      {p.photo ? (
                        <Image
                          src={p.photo.startsWith('http') ? p.photo : `/api/files/${p.photo}`}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <Flex
                          position="absolute"
                          inset={0}
                          align="center"
                          justify="center"
                          bg={{ base: 'gray.100', _dark: 'gray.800' }}
                        >
                          <Circle size={14} bg="brand.subtle" color="brand.solid">
                            <LuUserRound size={28} />
                          </Circle>
                        </Flex>
                      )}
                    </Box>
                    {/* Имя + команда */}
                    <VStack gap={0.5} px={3} py={2.5} align="start">
                      <Text fontWeight="semibold" fontSize="sm" lineClamp={1}>
                        {p.name}
                      </Text>
                      {teamName && (
                        <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                          {teamName}
                        </Text>
                      )}
                    </VStack>
                  </Box>
                </Link>
              )
            })}
          </SimpleGrid>
        </Box>
      )}

      {/* Пустое состояние */}
      {players.length === 0 && (
        <VStack py={16} textAlign="center" gap={4} className="fade-in-up">
          <Circle size={20} bg="brand.50" _dark={{ bg: 'brand.950' }}>
            <LuUserRound size={40} color="var(--chakra-colors-brand-solid)" />
          </Circle>
          <Heading size="md" color="fg.muted">
            Поэты пока не добавлены
          </Heading>
          <Text fontSize="sm" color="fg.subtle">
            Скоро здесь появится рейтинг участников турнира
          </Text>
        </VStack>
      )}
    </VStack>
  )
}
