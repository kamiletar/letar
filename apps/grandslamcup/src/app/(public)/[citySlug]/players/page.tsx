/**
 * Список поэтов — карточки с фото, именем и командой.
 * При наличии performances — рейтинговая таблица сверху.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { Box, Circle, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LuUserRound } from 'react-icons/lu'

import { LoadMoreButton } from '@/app/_components/load-more-button'

import { PlayerRatingTable, type PlayerStat } from '@/app/_components/player-rating-table'

import { PlayerFilters } from './_components/player-filters'

/** Минимум выступлений для попадания в рейтинг */
const MIN_PERFORMANCES = 3

type Params = Promise<{ citySlug: string }>
type SearchParams = Promise<{ season?: string; team?: string; q?: string; limit?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return { title: 'Город не найден' }
  }
  return {
    title: `Поэты — ${city.name}`,
    description: `Рейтинг поэтов Кубка Большого Слэма в ${city.name}`,
    alternates: { canonical: `/${citySlug}/players` },
  }
}

export default async function PlayersPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const { season: seasonId, team: teamSlug, q, limit: limitParam } = await searchParams
  const parsedLimit = Number(limitParam)
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20

  // Загружаем справочники для фильтров (сезоны только текущего города)
  const [seasons, teams] = await Promise.all([
    prisma.season.findMany({
      where: { cityId: city.id },
      orderBy: { startDate: 'desc' },
      select: { id: true, name: true },
    }),
    prisma.team.findMany({
      where: { cityId: city.id },
      orderBy: { name: 'asc' },
      select: { slug: true, name: true },
    }),
  ])

  // Формируем фильтры для перформансов
  const performanceWhere: Record<string, unknown> = {
    totalScore: { not: null },
  }
  if (seasonId) {
    performanceWhere.match = { tour: { round: { seasonId } } }
  }

  // Фильтр игроков: город из URL, опционально по сезону и команде
  // Неиграющие тренеры (isPlaying=false) не показываются в общем списке поэтов
  const playerWhere: Record<string, unknown> = {
    cityId: city.id,
    playerTeamSeasons: {
      some: { leftAt: null, isPlaying: true },
    },
  }
  // Поиск по имени
  if (q) {
    playerWhere.name = { contains: q, mode: 'insensitive' }
  }
  // Фильтр по команде (добавляем isPlaying: true для фильтрации неиграющих)
  if (teamSlug) {
    playerWhere.playerTeamSeasons = {
      some: { teamSeason: { team: { slug: teamSlug } }, leftAt: null, isPlaying: true },
    }
  }
  // Фильтр по сезону (добавляем isPlaying: true для фильтрации неиграющих)
  if (seasonId && !teamSlug) {
    playerWhere.playerTeamSeasons = {
      some: { teamSeason: { seasonId }, leftAt: null, isPlaying: true },
    }
  }

  // Параллельно: список игроков с лимитом + общее количество для пагинации
  const [players, totalCount] = await Promise.all([
    prisma.player.findMany({
      where: playerWhere,
      orderBy: { name: 'asc' },
      take: limit,
      include: {
        performances: {
          where: performanceWhere,
          select: { totalScore: true, textAdjusted: true, deliveryAdjusted: true },
        },
        playerTeamSeasons: {
          include: {
            teamSeason: { include: { team: { select: { name: true, slug: true } } } },
          },
          where: { leftAt: null },
          take: 1,
          orderBy: { teamSeason: { season: { startDate: 'desc' } } },
        },
      },
    }),
    prisma.player.count({ where: playerWhere }),
  ])

  // Считаем статистику для рейтинговой таблицы
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
    .sort((a, b) => b.totalScore - a.totalScore || b.avgScore - a.avgScore)

  const hasRating = playerStats.length > 0

  return (
    <VStack gap={8} align="stretch">
      <Flex justify="space-between" align="center">
        <SectionHeading>Поэты</SectionHeading>
        <Text fontSize="sm" color="fg.muted">
          {players.length === totalCount ? totalCount : `${players.length} из ${totalCount}`} поэтов
        </Text>
      </Flex>

      {/* Фильтры */}
      <Suspense>
        <PlayerFilters
          seasons={seasons.map((s) => ({ value: s.id, label: s.name }))}
          teams={teams.map((t) => ({ value: t.slug, label: t.name }))}
          currentSeason={seasonId}
          currentTeam={teamSlug}
          currentQuery={q}
          basePath={`/${citySlug}/players`}
        />
      </Suspense>

      {/* Рейтинговая таблица (если есть performances) */}
      {hasRating && (
        <>
          <SectionHeading size="md">Рейтинг</SectionHeading>
          <PlayerRatingTable players={playerStats} citySlug={citySlug} showDetailedStats />
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
                <Link key={p.id} href={`/${citySlug}/players/${p.slug}`}>
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
                      {p.photo
                        ? (
                          <Image
                            src={p.photo.startsWith('http') ? p.photo : `/api/files/${p.photo}`}
                            alt={p.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
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

          {/* Пагинация "Показать ещё" */}
          <Suspense>
            <LoadMoreButton currentCount={players.length} totalCount={totalCount} />
          </Suspense>
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
