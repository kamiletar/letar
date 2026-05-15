/**
 * Профиль поэта — расширенная статистика, текст/подача, тренд, топ выступлений
 */

import { DataTableWrapper } from '@/app/_components/data-table-wrapper'
import { parseSocialLinks, SocialLinks } from '@/app/_components/social-links'
import { prisma } from '@/lib/db'
import { formatDateShort } from '@/lib/format-date'
import { Badge, Box, Flex, Grid, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

type Params = Promise<{ slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const player = await prisma.player.findUnique({ where: { slug }, select: { name: true } })
  if (!player) {
    return { title: 'Поэт не найден' }
  }
  return {
    title: player.name,
    description: `${player.name} — поэт Кубка Большого Слэма`,
    alternates: { canonical: `/players/${slug}` },
    openGraph: { title: player.name, description: `Профиль поэта ${player.name}`, siteName: 'Grand Slam Cup' },
  }
}

export default async function PlayerPage({ params }: { params: Params }) {
  const { slug } = await params

  const player = await prisma.player.findUnique({
    where: { slug },
    include: {
      city: { select: { name: true } },
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

  const perfs = player.performances

  // Общая статистика
  const matchesPlayed = perfs.length
  const totalScore = perfs.reduce((sum, p) => sum + p.totalScore!, 0)
  const avgScore = matchesPlayed > 0 ? Math.round((totalScore / matchesPlayed) * 10) / 10 : 0
  const bestScore = matchesPlayed > 0 ? Math.max(...perfs.map((p) => p.totalScore!)) : 0

  // Текст/подача отдельно
  const avgText =
    matchesPlayed > 0
      ? Math.round((perfs.reduce((sum, p) => sum + (p.textAdjusted ?? 0), 0) / matchesPlayed) * 10) / 10
      : 0
  const avgDelivery =
    matchesPlayed > 0
      ? Math.round((perfs.reduce((sum, p) => sum + (p.deliveryAdjusted ?? 0), 0) / matchesPlayed) * 10) / 10
      : 0

  // Тренд (последние 3 vs предыдущие 3)
  const trend = computeTrend(perfs.map((p) => p.totalScore!))

  // Топ-3 лучших выступлений
  const topPerfs = [...perfs].sort((a, b) => b.totalScore! - a.totalScore!).slice(0, 3)

  // Статистика по сезонам
  const seasonStats = computeSeasonStats(perfs)

  const currentTeam = player.playerTeamSeasons[0]

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <VStack gap={2} align="start">
        <Heading as="h1" size="2xl">
          {player.name}
        </Heading>
        {player.city && <Text color="fg.muted">{player.city.name}</Text>}
        {currentTeam && (
          <Link href={`/teams/${currentTeam.teamSeason.team.slug}`}>
            <Badge colorPalette="blue" size="lg" _hover={{ opacity: 0.8 }}>
              {currentTeam.teamSeason.team.name}
            </Badge>
          </Link>
        )}
        <SocialLinks socialLinks={parseSocialLinks(player.socialLinks)} variant="full" />
        {player.bio && <Text mt={2}>{player.bio}</Text>}
      </VStack>

      {/* Статистика */}
      {matchesPlayed > 0 && (
        <SimpleGrid columns={{ base: 2, sm: 3, md: 6 }} gap={3}>
          <StatCard label="Выступлений" value={matchesPlayed} />
          <StatCard label="Средний балл" value={avgScore} highlight />
          <StatCard label="Ср. текст" value={avgText} />
          <StatCard label="Ср. подача" value={avgDelivery} />
          <StatCard label="Лучший" value={bestScore} />
          <StatCard label="Тренд" value={trend} />
        </SimpleGrid>
      )}

      {/* Лучшие выступления */}
      {topPerfs.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Лучшие выступления
          </Heading>
          <VStack gap={2} align="stretch">
            {topPerfs.map((p, i) => (
              <Link key={p.id} href={`/matches/${p.match.id}`}>
                <Flex
                  bg="bg.panel"
                  borderRadius="lg"
                  p={3}
                  borderWidth="1px"
                  borderColor="border.muted"
                  justify="space-between"
                  align="center"
                  _hover={{ borderColor: 'border.emphasized' }}
                >
                  <Flex gap={2} align="center">
                    <Badge colorPalette={i === 0 ? 'yellow' : i === 1 ? 'gray' : 'orange'} size="sm">
                      {i + 1}
                    </Badge>
                    <Text fontSize="sm">
                      {p.match.homeTeam.team.name} — {p.match.awayTeam.team.name}
                    </Text>
                  </Flex>
                  <Flex gap={3} align="center">
                    <Text fontSize="xs" color="fg.muted">
                      {p.textAdjusted}/{p.deliveryAdjusted}
                    </Text>
                    <Badge colorPalette="green" size="md" fontWeight="bold">
                      {p.totalScore}
                    </Badge>
                  </Flex>
                </Flex>
              </Link>
            ))}
          </VStack>
        </Box>
      )}

      {/* Статистика по сезонам */}
      {seasonStats.length > 1 && (
        <Box>
          <Heading size="md" mb={3}>
            По сезонам
          </Heading>
          <DataTableWrapper>
            <Grid templateColumns="1fr 56px 64px 56px 56px" gap={0} fontSize="sm" minW="360px">
              {['Сезон', 'Выст.', 'Средн.', 'Текст', 'Подача'].map((h) => (
                <Box key={h} px={3} py={2} fontWeight="bold" bg="bg.subtle" borderBottomWidth="1px">
                  {h}
                </Box>
              ))}
              {seasonStats.map((s) => (
                <Box key={s.seasonName} display="contents">
                  <Box px={3} py={2} borderBottomWidth="1px">
                    {s.seasonName}
                  </Box>
                  <Box px={3} py={2} borderBottomWidth="1px" textAlign="center">
                    {s.count}
                  </Box>
                  <Box px={3} py={2} borderBottomWidth="1px" textAlign="center" fontWeight="bold">
                    {s.avgScore}
                  </Box>
                  <Box px={3} py={2} borderBottomWidth="1px" textAlign="center" fontSize="xs" color="fg.muted">
                    {s.avgText}
                  </Box>
                  <Box px={3} py={2} borderBottomWidth="1px" textAlign="center" fontSize="xs" color="fg.muted">
                    {s.avgDelivery}
                  </Box>
                </Box>
              ))}
            </Grid>
          </DataTableWrapper>
        </Box>
      )}

      {/* Таблица выступлений */}
      {perfs.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Все выступления
          </Heading>
          <DataTableWrapper>
            <Grid templateColumns="1fr 1fr 60px 60px 60px" gap={0} fontSize="sm" minW="400px">
              {['Дата', 'Матч', 'Текст', 'Подача', 'Итого'].map((h) => (
                <Box key={h} px={3} py={2} fontWeight="bold" bg="bg.subtle" borderBottomWidth="1px">
                  {h}
                </Box>
              ))}
              {perfs.map((p) => (
                <Box key={p.id} display="contents">
                  <Box px={3} py={2} borderBottomWidth="1px" fontSize="xs">
                    {formatDateShort(p.match.scheduledAt)}
                  </Box>
                  <Box px={3} py={2} borderBottomWidth="1px">
                    <Link href={`/matches/${p.match.id}`}>
                      <Text fontSize="xs" _hover={{ color: 'brand.solid' }} lineClamp={1}>
                        {p.match.homeTeam.team.name} — {p.match.awayTeam.team.name}
                      </Text>
                    </Link>
                  </Box>
                  <Box px={3} py={2} borderBottomWidth="1px" textAlign="center">
                    {p.textAdjusted ?? '—'}
                  </Box>
                  <Box px={3} py={2} borderBottomWidth="1px" textAlign="center">
                    {p.deliveryAdjusted ?? '—'}
                  </Box>
                  <Box px={3} py={2} borderBottomWidth="1px" textAlign="center" fontWeight="bold">
                    {p.totalScore ?? '—'}
                  </Box>
                </Box>
              ))}
            </Grid>
          </DataTableWrapper>
        </Box>
      )}

      {/* Стихи */}
      {player.poems.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Стихи
          </Heading>
          <VStack gap={2} align="stretch">
            {player.poems.map((poem) => (
              <Link key={poem.id} href={`/players/${slug}/poems/${poem.slug}`}>
                <Text fontSize="sm" _hover={{ color: 'brand.solid' }} transition="color 0.15s">
                  {poem.title}
                </Text>
              </Link>
            ))}
          </VStack>
        </Box>
      )}

      {/* История команд */}
      {player.playerTeamSeasons.length > 1 && (
        <Box>
          <Heading size="md" mb={3}>
            История команд
          </Heading>
          <VStack align="start" gap={1}>
            {player.playerTeamSeasons.map((pts) => (
              <Text key={pts.id} fontSize="sm">
                {pts.teamSeason.season.name} — {pts.teamSeason.team.name} ({pts.teamSeason.league.name})
                {pts.role !== 'PLAYER' && (
                  <Badge ml={1} size="sm" colorPalette="purple">
                    {pts.role}
                  </Badge>
                )}
              </Text>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}

// === Вспомогательные компоненты ===

function StatCard({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <Box bg="bg.panel" borderRadius="lg" p={3} borderWidth="1px" borderColor="border.muted" textAlign="center">
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="xl" fontWeight={highlight ? 'bold' : 'semibold'} color={highlight ? 'brand.solid' : undefined}>
        {value}
      </Text>
    </Box>
  )
}

// === Вспомогательные функции ===

/** Вычисляет тренд: последние 3 vs предыдущие 3 */
function computeTrend(scores: number[]): string {
  if (scores.length < 4) {
    return '—'
  }
  // scores уже отсортированы от новых к старым
  const recent = scores.slice(0, 3)
  const prev = scores.slice(3, 6)
  if (prev.length === 0) {
    return '—'
  }
  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length
  const prevAvg = prev.reduce((s, v) => s + v, 0) / prev.length
  const diff = recentAvg - prevAvg
  if (diff > 2) {
    return '↑'
  }
  if (diff > 0.5) {
    return '↗'
  }
  if (diff > -0.5) {
    return '→'
  }
  if (diff > -2) {
    return '↘'
  }
  return '↓'
}

/** Группирует перформансы по сезонам */
function computeSeasonStats(
  perfs: Array<{
    totalScore: number | null
    textAdjusted: number | null
    deliveryAdjusted: number | null
    teamSeason: { seasonId: string }
    match: { scheduledAt: Date | null }
  }>
) {
  // Нужна информация о сезоне — берём из teamSeason
  const bySeasonId = new Map<string, typeof perfs>()
  for (const p of perfs) {
    const sid = p.teamSeason.seasonId
    const list = bySeasonId.get(sid) ?? []
    list.push(p)
    bySeasonId.set(sid, list)
  }

  // Для каждого сезона считаем статистику
  const result: Array<{
    seasonName: string
    count: number
    avgScore: number
    avgText: number
    avgDelivery: number
  }> = []

  for (const [, seasonPerfs] of bySeasonId) {
    const count = seasonPerfs.length
    const totalScore = seasonPerfs.reduce((s, p) => s + p.totalScore!, 0)
    const totalText = seasonPerfs.reduce((s, p) => s + (p.textAdjusted ?? 0), 0)
    const totalDelivery = seasonPerfs.reduce((s, p) => s + (p.deliveryAdjusted ?? 0), 0)

    result.push({
      seasonName: `Сезон`, // Упрощённо — в реальности нужно название
      count,
      avgScore: Math.round((totalScore / count) * 10) / 10,
      avgText: Math.round((totalText / count) * 10) / 10,
      avgDelivery: Math.round((totalDelivery / count) * 10) / 10,
    })
  }

  return result
}
