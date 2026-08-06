/**
 * Общий контент турнирной таблицы — используется и на глобальной, и на city странице.
 * Расчёт статистики на лету из результатов матчей.
 */

import { DataTableWrapper } from '@/app/_components/data-table-wrapper'
import { SeasonSelector } from '@/app/_components/season-selector'
import { TableHeader } from '@/app/_components/stat-tooltip'
import { prisma } from '@/lib/db'
import { Badge, Box, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'

import { CrossTable } from './cross-table'
import type { StandingsView } from './standings-view-toggle'
import { StandingsViewToggle } from './standings-view-toggle'

interface StandingsContentProps {
  /** Slug города (если есть — фильтрация по городу) */
  citySlug?: string
  /** ID города для фильтрации сезонов */
  cityId?: string
  /** Slug выбранного сезона из searchParams */
  seasonSlug?: string
  /** Текущий вид: таблица или перекрёстная */
  view?: StandingsView
}

export async function StandingsContent({ citySlug, cityId, seasonSlug, view = 'table' }: StandingsContentProps) {
  const basePath = citySlug ? `/${citySlug}/standings` : '/standings'
  const teamLinkPrefix = citySlug ? `/${citySlug}/teams` : '/teams'

  // Загружаем сезоны (с фильтрацией по городу если указан)
  const seasons = await prisma.season.findMany({
    where: cityId ? { cityId } : {},
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, slug: true, status: true, format: true, cityId: true },
  })

  // Определяем текущий сезон
  const currentSeason = seasonSlug
    ? seasons.find((s) => s.slug === seasonSlug)
    : (seasons.find((s) => s.status === 'ACTIVE') ?? seasons[0])

  if (!currentSeason) {
    return (
      <VStack py={12}>
        <Text color="fg.muted">Сезоны пока не созданы</Text>
      </VStack>
    )
  }

  // Загружаем команды сезона
  const teamSeasons = await prisma.teamSeason.findMany({
    where: { seasonId: currentSeason.id },
    include: {
      team: { select: { name: true, slug: true } },
      league: { select: { name: true, order: true } },
    },
  })

  // Загружаем завершённые матчи сезона
  const matches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      tour: { round: { seasonId: currentSeason.id } },
    },
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      homePoints: true,
      awayPoints: true,
    },
  })

  // Считаем статистику
  const statsMap = new Map<
    string,
    { played: number; won: number; drawn: number; lost: number; scored: number; conceded: number; points: number }
  >()

  const emptyStats = () => ({ played: 0, won: 0, drawn: 0, lost: 0, scored: 0, conceded: 0, points: 0 })

  for (const m of matches) {
    const home = statsMap.get(m.homeTeamId) ?? emptyStats()
    home.played++
    home.scored += m.homeScore
    home.conceded += m.awayScore
    home.points += m.homePoints ?? 0
    if ((m.homePoints ?? 0) === 1) {
      home.won++
    } else if ((m.homePoints ?? 0) === 0.5) {
      home.drawn++
    } else {
      home.lost++
    }
    statsMap.set(m.homeTeamId, home)

    const away = statsMap.get(m.awayTeamId) ?? emptyStats()
    away.played++
    away.scored += m.awayScore
    away.conceded += m.homeScore
    away.points += m.awayPoints ?? 0
    if ((m.awayPoints ?? 0) === 1) {
      away.won++
    } else if ((m.awayPoints ?? 0) === 0.5) {
      away.drawn++
    } else {
      away.lost++
    }
    statsMap.set(m.awayTeamId, away)
  }

  // Группируем по лигам
  const leagues = new Map<string, typeof teamSeasons>()
  for (const ts of teamSeasons) {
    const leagueName = ts.league.name
    if (!leagues.has(leagueName)) {
      leagues.set(leagueName, [])
    }
    leagues.get(leagueName)!.push(ts)
  }

  const isSwiss = currentSeason.format === 'SWISS'

  return (
    <VStack gap={8} align="stretch">
      <Heading as="h1" size="xl">
        Турнирная таблица
      </Heading>

      <HStack justify="space-between" wrap="wrap" gap={3}>
        <SeasonSelector seasons={seasons} currentId={currentSeason.id} basePath={basePath} />
        {!isSwiss && <StandingsViewToggle currentView={view} />}
      </HStack>

      {isSwiss && (
        <HStack>
          <Badge colorPalette="blue" size="sm">
            Швейцарская система
          </Badge>
        </HStack>
      )}

      {/* Перекрёстная таблица */}
      {view === 'cross'
        && !isSwiss
        && [...leagues.entries()]
          .sort(([, a], [, b]) => (a[0]?.league.order ?? 0) - (b[0]?.league.order ?? 0))
          .map(([leagueName, teams]) => {
            // Та же логика: скрываем команды без игр, если сезон уже стартовал
            const seasonStarted = matches.length > 0
            const activeTeams = seasonStarted ? teams.filter((ts) => (statsMap.get(ts.id)?.played ?? 0) > 0) : teams
            return (
              <Box key={`cross-${leagueName}`}>
                <Heading size="md" mb={3}>
                  {leagueName}
                </Heading>
                <CrossTable
                  teams={activeTeams.map((ts) => ({ id: ts.id, name: ts.team.name, slug: ts.team.slug }))}
                  matches={matches}
                  citySlug={citySlug}
                />
              </Box>
            )
          })}

      {/* Обычная таблица */}
      {view === 'table'
        && [...leagues.entries()]
          .sort(([, a], [, b]) => (a[0]?.league.order ?? 0) - (b[0]?.league.order ?? 0))
          .map(([leagueName, teams]) => {
            const allRows = teams.map((ts) => ({
              teamName: ts.team.name,
              teamSlug: ts.team.slug,
              ...(statsMap.get(ts.id) ?? emptyStats()),
            }))
            // Если в сезоне уже были матчи, скрываем команды без единой игры —
            // скорее всего они вылетели, не заявились или играют в другом городе
            const seasonStarted = matches.length > 0
            const rows = (seasonStarted ? allRows.filter((r) => r.played > 0) : allRows).sort((a, b) => {
              if (isSwiss) {
                return b.won - a.won || b.scored - b.conceded - (a.scored - a.conceded)
              }
              return b.points - a.points || b.scored - b.conceded - (a.scored - a.conceded)
            })

            return (
              <Box key={leagueName}>
                <Heading size="md" mb={3}>
                  {leagueName}
                </Heading>
                <DataTableWrapper>
                  {isSwiss
                    ? (
                      <Grid templateColumns="40px 1fr repeat(4, 60px)" gap={0} fontSize="sm" minW="400px">
                        {[
                          { label: '#', tooltip: 'Позиция' },
                          { label: 'Команда' },
                          { label: 'W', tooltip: 'Победы (Wins)' },
                          { label: 'L', tooltip: 'Поражения (Losses)' },
                          { label: 'Заб', tooltip: 'Забитые баллы' },
                          { label: 'Разн', tooltip: 'Разница баллов' },
                        ].map((h) => <TableHeader key={h.label} label={h.label} tooltip={h.tooltip} />)}
                        {rows.map((row, i) => (
                          <SwissRow
                            key={row.teamSlug}
                            row={row}
                            position={i + 1}
                            total={rows.length}
                            teamLinkPrefix={teamLinkPrefix}
                          />
                        ))}
                      </Grid>
                    )
                    : (
                      <Grid templateColumns="40px 1fr repeat(7, 50px)" gap={0} fontSize="sm" minW="500px">
                        {[
                          { label: '#', tooltip: 'Позиция' },
                          { label: 'Команда' },
                          { label: 'И', tooltip: 'Игры' },
                          { label: 'В', tooltip: 'Победы' },
                          { label: 'Н', tooltip: 'Ничьи' },
                          { label: 'П', tooltip: 'Поражения' },
                          { label: 'Заб', tooltip: 'Забитые баллы' },
                          { label: 'Проп', tooltip: 'Пропущенные баллы' },
                          { label: 'О', tooltip: 'Очки' },
                        ].map((h) => <TableHeader key={h.label} label={h.label} tooltip={h.tooltip} />)}
                        {rows.map((row, i) => (
                          <StandingsRow
                            key={row.teamSlug}
                            row={row}
                            position={i + 1}
                            total={rows.length}
                            teamLinkPrefix={teamLinkPrefix}
                          />
                        ))}
                      </Grid>
                    )}
                </DataTableWrapper>
              </Box>
            )
          })}

      {teamSeasons.length === 0 && (
        <VStack py={8} textAlign="center" bg="bg.subtle" borderRadius="xl" gap={2}>
          <Text fontSize="lg" color="fg.muted">
            В этом сезоне пока нет команд
          </Text>
          <Text fontSize="sm" color="fg.subtle">
            Команды появятся после начала регистрации
          </Text>
        </VStack>
      )}
    </VStack>
  )
}

// === Вспомогательные компоненты ===

function PositionBadge({ position }: { position: number }) {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
  if (medals[position]) {
    return (
      <Text>
        {medals[position]} {position}
      </Text>
    )
  }
  return <Text>{position}</Text>
}

function getZoneStyle(position: number, total: number) {
  if (position <= 3) {
    return { borderLeftWidth: '3px', borderLeftColor: 'success.500' }
  }
  if (total > 4 && position >= total - 1) {
    return { borderLeftWidth: '3px', borderLeftColor: 'error.500' }
  }
  return {}
}

interface RowProps {
  teamLinkPrefix: string
}

function StandingsRow({
  row,
  position,
  total,
  teamLinkPrefix,
}: {
  row: {
    teamName: string
    teamSlug: string
    played: number
    won: number
    drawn: number
    lost: number
    scored: number
    conceded: number
    points: number
  }
  position: number
  total: number
} & RowProps) {
  const isEven = position % 2 === 0
  const zoneStyle = getZoneStyle(position, total)

  return (
    <>
      <Box px={3} py={2} borderBottomWidth="1px" fontWeight="bold" bg={isEven ? 'bg.subtle' : undefined} {...zoneStyle}>
        <PositionBadge position={position} />
      </Box>
      <Box px={3} py={2} borderBottomWidth="1px" bg={isEven ? 'bg.subtle' : undefined}>
        <Link href={`${teamLinkPrefix}/${row.teamSlug}`}>
          <Text _hover={{ color: 'brand.solid' }}>{row.teamName}</Text>
        </Link>
      </Box>
      {[row.played, row.won, row.drawn, row.lost, row.scored, row.conceded].map((val, i) => (
        <Box key={i} px={3} py={2} borderBottomWidth="1px" textAlign="center" bg={isEven ? 'bg.subtle' : undefined}>
          {val}
        </Box>
      ))}
      <Box
        px={3}
        py={2}
        borderBottomWidth="1px"
        textAlign="center"
        fontWeight="bold"
        bg={isEven ? 'bg.subtle' : undefined}
      >
        {row.points}
      </Box>
    </>
  )
}

function SwissRow({
  row,
  position,
  total,
  teamLinkPrefix,
}: {
  row: { teamName: string; teamSlug: string; won: number; lost: number; scored: number; conceded: number }
  position: number
  total: number
} & RowProps) {
  const diff = row.scored - row.conceded
  const isEven = position % 2 === 0
  const zoneStyle = getZoneStyle(position, total)

  return (
    <>
      <Box px={3} py={2} borderBottomWidth="1px" fontWeight="bold" bg={isEven ? 'bg.subtle' : undefined} {...zoneStyle}>
        <PositionBadge position={position} />
      </Box>
      <Box px={3} py={2} borderBottomWidth="1px" bg={isEven ? 'bg.subtle' : undefined}>
        <Link href={`${teamLinkPrefix}/${row.teamSlug}`}>
          <Text _hover={{ color: 'brand.solid' }}>{row.teamName}</Text>
        </Link>
      </Box>
      <Box
        px={3}
        py={2}
        borderBottomWidth="1px"
        textAlign="center"
        fontWeight="bold"
        color="green.fg"
        bg={isEven ? 'bg.subtle' : undefined}
      >
        {row.won}
      </Box>
      <Box
        px={3}
        py={2}
        borderBottomWidth="1px"
        textAlign="center"
        fontWeight="bold"
        color="red.fg"
        bg={isEven ? 'bg.subtle' : undefined}
      >
        {row.lost}
      </Box>
      <Box px={3} py={2} borderBottomWidth="1px" textAlign="center" bg={isEven ? 'bg.subtle' : undefined}>
        {row.scored}
      </Box>
      <Box
        px={3}
        py={2}
        borderBottomWidth="1px"
        textAlign="center"
        fontWeight="bold"
        bg={isEven ? 'bg.subtle' : undefined}
      >
        {diff > 0 ? `+${diff}` : diff}
      </Box>
    </>
  )
}
