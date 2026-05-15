/**
 * Список команд — карточки с названием, стадионом, лигой (город-фильтр).
 * Визуальный стиль: карточки с hover-lift, иконки, badge лиги, brand-акценты.
 */

import { LoadMoreButton } from '@/app/_components/load-more-button'
import { SearchInput } from '@/app/_components/search-input'
import { SectionHeading } from '@/app/_components/section-heading'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { Badge, Box, Circle, Flex, Heading, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuMapPin, LuUsers } from 'react-icons/lu'

import { Suspense } from 'react'

type Params = Promise<{ citySlug: string }>
type SearchParams = Promise<{ q?: string; limit?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return { title: 'Город не найден' }
  }
  return {
    title: `Команды — ${city.name}`,
    description: `Команды Кубка Большого Слэма в ${city.name}`,
    alternates: { canonical: `/${citySlug}/teams` },
  }
}

export default async function TeamsPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { citySlug } = await params
  const { q, limit: limitParam } = await searchParams
  const parsedLimit = Number(limitParam)
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const teamWhere = {
    cityId: city.id,
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
  }

  // Параллельно: список команд с лимитом + общее количество для пагинации
  const [teams, totalCount] = await Promise.all([
    prisma.team.findMany({
      where: teamWhere,
      orderBy: { name: 'asc' },
      take: limit,
      include: {
        city: { select: { name: true } },
        homeVenue: { select: { name: true } },
        teamSeasons: {
          include: {
            league: { select: { name: true } },
            season: { select: { name: true, status: true } },
          },
          orderBy: { season: { startDate: 'desc' } },
          take: 1,
        },
        _count: {
          select: {
            teamSeasons: true,
          },
        },
      },
    }),
    prisma.team.count({ where: teamWhere }),
  ])

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <SectionHeading>Команды</SectionHeading>
        <Flex align="center" gap={3}>
          <Suspense>
            <SearchInput placeholder="Поиск команды..." basePath={`/${citySlug}/teams`} />
          </Suspense>
          <Text fontSize="sm" color="fg.muted" whiteSpace="nowrap">
            {teams.length === totalCount ? totalCount : `${teams.length} из ${totalCount}`}
          </Text>
        </Flex>
      </Flex>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={4}>
        {[...teams]
          .sort((a, b) => {
            const aActive = a.teamSeasons[0]?.season.status === 'ACTIVE' ? 1 : 0
            const bActive = b.teamSeasons[0]?.season.status === 'ACTIVE' ? 1 : 0
            if (aActive !== bActive) {
              return bActive - aActive
            }
            return a.name.localeCompare(b.name, 'ru')
          })
          .map((team) => {
            const currentSeason = team.teamSeasons[0]
            const isActive = currentSeason?.season.status === 'ACTIVE'
            const initial = team.name.charAt(0).toUpperCase()

            return (
              <Link key={team.id} href={`/${citySlug}/teams/${team.slug}`}>
                <Box
                  p={5}
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor="border"
                  bg="bg.panel"
                  opacity={isActive ? 1 : 0.65}
                  filter={isActive ? undefined : 'grayscale(0.4)'}
                  _hover={{
                    shadow: 'lg',
                    borderColor: 'border.emphasized',
                    transform: 'translateY(-2px)',
                    opacity: 1,
                    filter: 'none',
                  }}
                  transition="all 0.2s ease"
                  h="full"
                  position="relative"
                  overflow="hidden"
                >
                  {/* Декоративная полоска сверху */}
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    h="3px"
                    bg={isActive ? 'brand.solid' : 'gray.400'}
                    opacity={0.6}
                  />

                  <VStack gap={3} align="start">
                    {/* Лого или инициал + название */}
                    <HStack gap={3} align="center">
                      {team.logo ? (
                        <Box w={10} h={10} borderRadius="lg" overflow="hidden" flexShrink={0} position="relative">
                          <Image
                            src={`/api/files/${team.logo}`}
                            alt={team.name}
                            fill
                            sizes="40px"
                            style={{ objectFit: 'cover' }}
                          />
                        </Box>
                      ) : (
                        <Circle
                          size={10}
                          bg="brand.subtle"
                          color="brand.solid"
                          fontWeight="bold"
                          fontSize="lg"
                          flexShrink={0}
                        >
                          {initial}
                        </Circle>
                      )}
                      <Heading size="md" lineClamp={1}>
                        {team.name}
                      </Heading>
                    </HStack>

                    {/* Стадион */}
                    {team.homeVenue && (
                      <HStack gap={1.5} color="fg.muted" fontSize="sm">
                        <LuMapPin size={14} />
                        <Text lineClamp={1}>{team.homeVenue.name}</Text>
                      </HStack>
                    )}

                    {/* Лига */}
                    <Flex gap={2} align="center" wrap="wrap">
                      {currentSeason && (
                        <Badge colorPalette="blue" size="sm" variant="subtle">
                          {currentSeason.league.name}
                        </Badge>
                      )}
                      {isActive ? (
                        <Badge colorPalette="green" size="sm" variant="outline">
                          {currentSeason?.season.name}
                        </Badge>
                      ) : (
                        <Badge colorPalette="gray" size="sm" variant="subtle">
                          Не участвует
                        </Badge>
                      )}
                    </Flex>
                  </VStack>
                </Box>
              </Link>
            )
          })}
      </SimpleGrid>

      {/* Пагинация "Показать ещё" */}
      <Suspense>
        <LoadMoreButton currentCount={teams.length} totalCount={totalCount} />
      </Suspense>

      {teams.length === 0 && (
        <VStack py={16} textAlign="center" gap={4} className="fade-in-up">
          <Circle size={20} bg="brand.50" _dark={{ bg: 'brand.950' }}>
            <LuUsers size={40} color="var(--chakra-colors-brand-solid)" />
          </Circle>
          <Heading size="md" color="fg.muted">
            Команды пока не добавлены
          </Heading>
          <Text fontSize="sm" color="fg.subtle">
            Регистрация команд скоро откроется
          </Text>
        </VStack>
      )}
    </VStack>
  )
}
