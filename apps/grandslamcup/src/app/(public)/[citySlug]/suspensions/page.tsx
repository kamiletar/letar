/**
 * Реестр отстранённых поэтов города.
 * Показывает список активных и истёкших отстранений с фильтрацией.
 */

import { DataTableWrapper } from '@/app/_components/data-table-wrapper'
import { SectionHeading } from '@/app/_components/section-heading'
import { getCityBySlug } from '@/lib/city'
import { prisma } from '@/lib/db'
import { formatDate } from '@/lib/format-date'
import { playerDisplayName } from '@/lib/player-utils'
import { Badge, Box, Flex, Grid, HStack, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LuShieldAlert } from 'react-icons/lu'
import { SuspensionFilter } from './_components/suspension-filter'

type Params = Promise<{ citySlug: string }>
type SearchParams = Promise<{ activeOnly?: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { citySlug } = await params
  const city = await getCityBySlug(citySlug)
  if (!city) {
    return { title: 'Город не найден' }
  }
  return {
    title: `Дисциплина — ${city.name}`,
    description: `Реестр отстранённых поэтов Кубка Большого Слэма в ${city.name}`,
    alternates: { canonical: `/${citySlug}/suspensions` },
  }
}

/** Метка причины отстранения */
function reasonLabel(reason: string): string {
  switch (reason) {
    case 'RED_CARD':
      return 'Красная карточка'
    case 'YELLOW_ACCUMULATION':
      return 'Накопление жёлтых'
    case 'DOUBLE_YELLOW':
      return 'Две жёлтые'
    case 'PLAGIARISM':
      return 'Чтение чужих стихов'
    default:
      return reason
  }
}

export default async function SuspensionsPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { citySlug } = await params
  const { activeOnly } = await searchParams
  const city = await getCityBySlug(citySlug)
  if (!city) {
    notFound()
  }

  const showActiveOnly = activeOnly === '1'

  const suspensions = await prisma.playerSuspension.findMany({
    where: {
      player: { cityId: city.id },
      ...(showActiveOnly ? { active: true } : {}),
    },
    include: {
      player: {
        select: {
          id: true,
          name: true,
          disambiguation: true,
          slug: true,
          playerTeamSeasons: {
            where: { leftAt: null },
            include: { teamSeason: { include: { team: { select: { name: true } } } } },
            take: 1,
            orderBy: { joinedAt: 'desc' },
          },
        },
      },
      season: { select: { name: true } },
    },
    orderBy: [{ active: 'desc' }, { startedAt: 'desc' }],
  })

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <HStack gap={2}>
          <LuShieldAlert size={24} />
          <SectionHeading>Дисциплина</SectionHeading>
        </HStack>
        <SuspensionFilter activeOnly={showActiveOnly} citySlug={citySlug} />
      </Flex>

      {suspensions.length === 0 ? (
        <Box bg="bg.panel" borderRadius="xl" p={8} borderWidth="1px" borderColor="border" textAlign="center">
          <Text color="fg.muted" fontSize="lg">
            Нет отстранённых поэтов
          </Text>
        </Box>
      ) : (
        <DataTableWrapper>
          <Grid
            templateColumns={{ base: '1fr 1fr 1fr 100px', md: '1fr 1fr 1fr 120px 120px 90px' }}
            gap={0}
            fontSize="sm"
            minW="500px"
          >
            {/* Заголовки */}
            {['Поэт', 'Команда', 'Причина', 'Начало', 'Матчей осталось', 'Статус'].map((h, i) => (
              <Box
                key={h}
                px={3}
                py={2}
                fontWeight="bold"
                fontSize="xs"
                textTransform="uppercase"
                letterSpacing="wide"
                bg={{ base: 'gray.100', _dark: 'brand.950' }}
                color={{ base: 'fg.muted', _dark: 'gray.300' }}
                borderBottomWidth="2px"
                borderBottomColor="brand.solid"
                /* На мобильных скрываем Начало и Матчей */
                display={i >= 3 && i <= 4 ? { base: 'none', md: 'block' } : undefined}
              >
                {h}
              </Box>
            ))}

            {/* Строки */}
            {suspensions.map((s, i) => {
              const currentTeam = s.player.playerTeamSeasons[0]
              const isActive = s.active

              return (
                <Box key={s.id} display="contents">
                  {/* Поэт */}
                  <Box
                    px={3}
                    py={2}
                    borderBottomWidth="1px"
                    borderBottomColor="border.muted"
                    bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                  >
                    <Link href={`/${citySlug}/players/${s.player.slug}`}>
                      <Text fontWeight="medium" _hover={{ color: 'brand.solid' }} transition="color 0.15s">
                        {playerDisplayName(s.player)}
                      </Text>
                    </Link>
                  </Box>

                  {/* Команда */}
                  <Box
                    px={3}
                    py={2}
                    borderBottomWidth="1px"
                    borderBottomColor="border.muted"
                    bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                  >
                    <Text color="fg.muted" fontSize="sm">
                      {currentTeam?.teamSeason.team.name ?? '—'}
                    </Text>
                  </Box>

                  {/* Причина */}
                  <Box
                    px={3}
                    py={2}
                    borderBottomWidth="1px"
                    borderBottomColor="border.muted"
                    bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                  >
                    <Text fontSize="sm">{reasonLabel(s.reason)}</Text>
                  </Box>

                  {/* Начало (скрыто на мобильных) */}
                  <Box
                    px={3}
                    py={2}
                    borderBottomWidth="1px"
                    borderBottomColor="border.muted"
                    bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                    display={{ base: 'none', md: 'block' }}
                  >
                    <Text fontSize="sm" color="fg.muted">
                      {formatDate(s.startedAt)}
                    </Text>
                  </Box>

                  {/* Матчей осталось (скрыто на мобильных) */}
                  <Box
                    px={3}
                    py={2}
                    borderBottomWidth="1px"
                    borderBottomColor="border.muted"
                    textAlign="center"
                    bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                    display={{ base: 'none', md: 'block' }}
                  >
                    <Text fontFamily="mono" fontWeight="bold">
                      {s.untilEndOfSeason ? 'До конца сезона' : s.matchesLeft}
                    </Text>
                  </Box>

                  {/* Статус */}
                  <Box
                    px={3}
                    py={2}
                    borderBottomWidth="1px"
                    borderBottomColor="border.muted"
                    bg={i % 2 === 1 ? 'bg.subtle' : undefined}
                  >
                    <Badge colorPalette={isActive ? 'red' : 'gray'} variant="subtle" size="sm">
                      {isActive ? 'Активно' : 'Истёк'}
                    </Badge>
                  </Box>
                </Box>
              )
            })}
          </Grid>
        </DataTableWrapper>
      )}
    </VStack>
  )
}
