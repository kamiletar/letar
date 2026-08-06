/**
 * Дашборд тренера — профиль команды, статистика сезона + ближайшие матчи
 */

import { EditTeamButton } from '@/app/_components/edit-team-button'
import { parseSocialLinks } from '@/app/_components/social-links'
import { TeamLogoUploader } from '@/app/_components/team-logo-uploader'
import { prisma } from '@/lib/db'
import { formatDateTimeFull } from '@/lib/format-date'
import { getRoleLabel } from '@/lib/player-role-labels'
import { MATCH_TEAMS_NAME } from '@/lib/prisma-includes'
import { requireCoach } from '@/lib/roles'
import { Badge, Box, Button, Flex, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

export default async function CoachDashboardPage() {
  const coach = await requireCoach()

  // Загружаем команду с игроками
  const team = await prisma.team.findUnique({
    where: { id: coach.teamId },
    include: {
      homeVenue: { select: { name: true } },
      city: { select: { name: true, slug: true } },
    },
  })

  const citySlug = team?.city?.slug

  // Загружаем состав
  const roster = await prisma.playerTeamSeason.findMany({
    where: {
      teamSeasonId: coach.teamSeasonId,
      leftAt: null,
    },
    include: {
      player: { select: { name: true, slug: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })

  // Турнирная таблица команды (W/D/L + очки)
  const standings = await prisma.standings.findUnique({
    where: { teamSeasonId: coach.teamSeasonId },
  })
  const wins = standings?.won ?? 0
  const draws = standings?.drawn ?? 0
  const losses = standings?.lost ?? 0
  const totalPoints = standings?.points ?? 0
  const matchesPlayed = standings?.played ?? 0

  // Перформансы игроков команды (средний балл + топ-3)
  const performances = await prisma.playerPerformance.findMany({
    where: {
      teamSeasonId: coach.teamSeasonId,
      totalScore: { not: null },
    },
    select: { playerId: true, totalScore: true, player: { select: { name: true, slug: true } } },
  })

  // Средний балл команды
  const avgTeamScore = performances.length > 0
    ? performances.reduce((sum, p) => sum + (p.totalScore ?? 0), 0) / performances.length
    : 0

  // Топ-3 перформера (минимум 3 выступления)
  const playerStats = new Map<string, { name: string; slug: string; total: number; count: number }>()
  for (const p of performances) {
    const existing = playerStats.get(p.playerId)
    if (existing) {
      existing.total += p.totalScore ?? 0
      existing.count++
    } else {
      playerStats.set(p.playerId, {
        name: p.player.name,
        slug: p.player.slug,
        total: p.totalScore ?? 0,
        count: 1,
      })
    }
  }
  const topPerformers = [...playerStats.values()]
    .filter((s) => s.count >= 3)
    .map((s) => ({ ...s, avg: s.total / s.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)

  // Ближайшие матчи
  const upcomingMatches = await prisma.match.findMany({
    where: {
      status: 'SCHEDULED',
      OR: [{ homeTeamId: coach.teamSeasonId }, { awayTeamId: coach.teamSeasonId }],
    },
    include: {
      ...MATCH_TEAMS_NAME,
      venue: { select: { name: true } },
      lineups: {
        where: { teamSeasonId: coach.teamSeasonId },
        select: { id: true },
      },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 5,
  })

  return (
    <VStack gap={6} align="stretch">
      <Heading size="lg">Дашборд</Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
        {/* Профиль команды */}
        <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
          <Flex gap={4} align="start" mb={3}>
            <TeamLogoUploader teamId={coach.teamId} currentLogo={team?.logo} size={80} />
            <Flex flex={1} justify="space-between" align="start" gap={2}>
              <Heading size="md" pt={2}>
                {team?.name ?? coach.teamName}
              </Heading>
              {team && citySlug && (
                <EditTeamButton
                  teamId={team.id}
                  teamName={team.name}
                  description={team.description}
                  logo={team.logo}
                  socialLinks={parseSocialLinks(team.socialLinks)}
                  canEdit={coach.role === 'COACH'}
                  citySlug={citySlug}
                  teamSlug={team.slug}
                />
              )}
            </Flex>
          </Flex>
          {team?.description && (
            <Text fontSize="sm" color="fg.muted" mb={3} lineClamp={3}>
              {team.description}
            </Text>
          )}
          <VStack gap={2} align="stretch">
            <Flex justify="space-between">
              <Text color="fg.muted" fontSize="sm">
                Город
              </Text>
              <Text fontSize="sm">{team?.city?.name ?? '—'}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text color="fg.muted" fontSize="sm">
                Стадион
              </Text>
              <Text fontSize="sm">{team?.homeVenue?.name ?? '—'}</Text>
            </Flex>
            <Flex justify="space-between">
              <Text color="fg.muted" fontSize="sm">
                Состав
              </Text>
              <Text fontSize="sm">{roster.length} чел.</Text>
            </Flex>
            <Flex justify="space-between">
              <Text color="fg.muted" fontSize="sm">
                Роль
              </Text>
              <Badge colorPalette="teal" size="sm">
                {getRoleLabel(coach.role)}
              </Badge>
            </Flex>
          </VStack>
        </Box>

        {/* Состав (кратко) */}
        <Box bg="bg.panel" borderRadius="xl" p={5} borderWidth="1px" borderColor="border.muted">
          <Flex justify="space-between" align="center" mb={3}>
            <Heading size="md">Состав</Heading>
            <Link href="/coach/roster">
              <Text fontSize="sm" color="teal.fg" _hover={{ textDecoration: 'underline' }}>
                Подробнее
              </Text>
            </Link>
          </Flex>
          <VStack gap={1} align="stretch">
            {roster.slice(0, 8).map((pts) => (
              <Flex key={pts.id} justify="space-between" align="center" py={1}>
                <Link href={citySlug ? `/${citySlug}/players/${pts.player.slug}` : `/players/${pts.player.slug}`}>
                  <Text fontSize="sm" _hover={{ color: 'brand.solid' }}>
                    {pts.player.name}
                  </Text>
                </Link>
                <Badge
                  size="sm"
                  colorPalette={pts.role === 'COACH' || pts.role === 'ASSISTANT_COACH' ? 'teal' : 'gray'}
                >
                  {getRoleLabel(pts.role, pts.isPlaying)}
                </Badge>
              </Flex>
            ))}
            {roster.length > 8 && (
              <Link href="/coach/roster">
                <Text fontSize="xs" color="teal.fg" _hover={{ textDecoration: 'underline' }}>
                  Показать всех ({roster.length})
                </Text>
              </Link>
            )}
          </VStack>
        </Box>
      </SimpleGrid>

      {/* Статистика сезона */}
      <Box>
        <Heading size="md" mb={3}>
          Статистика
        </Heading>
        <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
          {/* Победы / Ничьи / Поражения */}
          <Box bg="bg.panel" borderRadius="xl" p={4} borderWidth="1px" borderColor="border.muted" textAlign="center">
            <Text fontSize="xs" color="fg.muted" mb={1}>
              W / D / L
            </Text>
            <Flex justify="center" gap={2}>
              <Badge colorPalette="green" size="sm">
                {wins}
              </Badge>
              <Badge colorPalette="gray" size="sm">
                {draws}
              </Badge>
              <Badge colorPalette="red" size="sm">
                {losses}
              </Badge>
            </Flex>
            <Text fontSize="xs" color="fg.muted" mt={1}>
              {matchesPlayed} {matchesPlayed === 1 ? 'матч' : 'матчей'}
            </Text>
          </Box>

          {/* Средний балл команды */}
          <Box bg="bg.panel" borderRadius="xl" p={4} borderWidth="1px" borderColor="border.muted" textAlign="center">
            <Text fontSize="xs" color="fg.muted" mb={1}>
              Средний балл
            </Text>
            <Text fontSize="2xl" fontWeight="bold" color="teal.fg">
              {avgTeamScore > 0 ? avgTeamScore.toFixed(1) : '—'}
            </Text>
            <Text fontSize="xs" color="fg.muted" mt={1}>
              {performances.length} выступлений
            </Text>
          </Box>

          {/* Суммарные турнирные очки */}
          <Box bg="bg.panel" borderRadius="xl" p={4} borderWidth="1px" borderColor="border.muted" textAlign="center">
            <Text fontSize="xs" color="fg.muted" mb={1}>
              Очки
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {totalPoints}
            </Text>
            <Text fontSize="xs" color="fg.muted" mt={1}>
              турнирные
            </Text>
          </Box>

          {/* Топ-3 перформера */}
          <Box bg="bg.panel" borderRadius="xl" p={4} borderWidth="1px" borderColor="border.muted">
            <Text fontSize="xs" color="fg.muted" mb={2} textAlign="center">
              Топ перформеры
            </Text>
            {topPerformers.length === 0
              ? (
                <Text fontSize="xs" color="fg.muted" textAlign="center">
                  Мало данных
                </Text>
              )
              : (
                <VStack gap={1} align="stretch">
                  {topPerformers.map((p, i) => (
                    <Flex key={p.slug} justify="space-between" align="center">
                      <Link href={citySlug ? `/${citySlug}/players/${p.slug}` : `/players/${p.slug}`}>
                        <Text fontSize="xs" truncate _hover={{ color: 'brand.solid' }}>
                          {i + 1}. {p.name}
                        </Text>
                      </Link>
                      <Badge colorPalette="teal" size="sm">
                        {p.avg.toFixed(1)}
                      </Badge>
                    </Flex>
                  ))}
                </VStack>
              )}
          </Box>
        </SimpleGrid>
      </Box>

      {/* Ближайшие матчи */}
      <Box>
        <Flex justify="space-between" align="center" mb={3}>
          <Heading size="md">Ближайшие матчи</Heading>
          <Link href="/coach/matches">
            <Text fontSize="sm" color="teal.fg" _hover={{ textDecoration: 'underline' }}>
              Все матчи
            </Text>
          </Link>
        </Flex>
        {upcomingMatches.length === 0
          ? (
            <Box bg="bg.panel" p={6} borderRadius="xl" textAlign="center">
              <Text color="fg.muted">Нет запланированных матчей</Text>
            </Box>
          )
          : (
            <VStack gap={3} align="stretch">
              {upcomingMatches.map((match) => {
                const isHome = match.homeTeamId === coach.teamSeasonId
                const opponent = isHome ? match.awayTeam.team.name : match.homeTeam.team.name
                const hasLineup = match.lineups.length > 0
                const hoursUntil = match.scheduledAt
                  ? (new Date(match.scheduledAt).getTime() - Date.now()) / (1000 * 60 * 60)
                  : Infinity
                const canSubmit = !hasLineup && hoursUntil >= 6

                return (
                  <Box
                    key={match.id}
                    bg="bg.panel"
                    borderRadius="xl"
                    p={4}
                    borderWidth="1px"
                    borderColor="border.muted"
                  >
                    <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                      <Box flex={1}>
                        <Text fontWeight="semibold">
                          vs {opponent} ({isHome ? 'дома' : 'в гостях'})
                        </Text>
                        <Text fontSize="sm" color="fg.muted">
                          {match.venue?.name ?? '—'}
                          {match.scheduledAt && ` · ${formatDateTimeFull(match.scheduledAt)}`}
                        </Text>
                        {/* Предупреждения по времени */}
                        {!hasLineup && hoursUntil < 6 && (
                          <Text fontSize="xs" color="red.500" mt={1}>
                            Заявка невозможна (менее 6 часов до матча)
                          </Text>
                        )}
                        {!hasLineup && hoursUntil >= 6 && hoursUntil < 24 && (
                          <Text fontSize="xs" color="yellow.500" mt={1}>
                            Осталось менее суток — заявьте состав!
                          </Text>
                        )}
                      </Box>
                      <Flex gap={2} align="center">
                        {hasLineup
                          ? (
                            <Badge colorPalette="green" size="sm">
                              Заявка подана
                            </Badge>
                          )
                          : canSubmit
                          ? (
                            <Link href={`/coach/matches/${match.id}/lineup`}>
                              <Button size="sm" colorPalette="teal">
                                Заявить состав
                              </Button>
                            </Link>
                          )
                          : (
                            <Badge colorPalette="red" size="sm">
                              Нет заявки
                            </Badge>
                          )}
                      </Flex>
                    </Flex>
                  </Box>
                )
              })}
            </VStack>
          )}
      </Box>
    </VStack>
  )
}
